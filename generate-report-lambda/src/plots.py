from fileinput import filename
import matplotlib
matplotlib.use('Agg')  # Required to run matplotlib in a non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, AutoMinorLocator
import matplotlib.colors as mcolors
from matplotlib.colors import LinearSegmentedColormap, Normalize, TwoSlopeNorm  # Import Normalize here
import matplotlib.patches as mpatches
import numpy as np
import boto3
import os
import io
from typing import Optional
import warnings
from matplotlib.collections import LineCollection
try:
    from scipy.interpolate import CubicSpline, interp1d
except Exception:
    CubicSpline = None  # type: ignore
    interp1d = None  # type: ignore
from dotenv import load_dotenv

import supports
import discretize

load_dotenv()

# Suppress noisy matplotlib warnings that don't affect output but spam logs
warnings.filterwarnings(
    "ignore",
    message=r".*fixed y limits to fulfill fixed data aspect.*",
    category=UserWarning,
)

# In-memory cache keyed by logical filename/key
PLOT_CACHE: dict[str, bytes] = {}
PLOT_CACHE_ENABLED = os.getenv('PLOT_CACHE_ENABLED', 'true').lower() in ('1', 'true', 'yes')

# Max size to keep images purely in-memory (in MB). Above this, fall back to /tmp
PLOT_INMEMORY_MAX_MB = int(os.getenv('PLOT_INMEMORY_MAX_MB', '64'))
PLOT_INMEMORY_MAX_BYTES = PLOT_INMEMORY_MAX_MB * 1024 * 1024

output_dir = 'output'
is_development = os.getenv('API_ENV', 'production') == 'development'

def make_figure_filename(team_id, project_id, report_id, fig_name):
    return f"{team_id}/{project_id}/{report_id}/{fig_name}"

def get_img_filepath(filename: str) -> str:
    if is_development:
        return os.path.join('output', filename)
    else:
        return filename

def save_plot(
    fig: plt.Figure,
    filename: str,
    content_type: str = 'image/png',
    dpi: int = 300
) -> str:
    """
    Saves a matplotlib figure to memory (and S3 if configured). Returns a logical key/URL.
    """
    filepath = get_img_filepath(filename)
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name

    # Try rendering to memory first; fall back to /tmp if large or on memory errors
    buf = io.BytesIO()
    try:
        fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
        buf.seek(0)
        data = buf.getvalue()

        # If the rendered image is small enough, keep in memory
        if len(data) <= PLOT_INMEMORY_MAX_BYTES:
            if dev_local:
                if PLOT_CACHE_ENABLED:
                    PLOT_CACHE[filepath] = data
                return filepath
            else:
                # Upload to S3 from memory
                s3_client = boto3.client('s3')
                s3_client.upload_fileobj(
                    io.BytesIO(data),
                    bucket_name,
                    filepath,
                    ExtraArgs={'ContentType': content_type}
                )
                # Cache small images in memory for reuse within same invocation
                if PLOT_CACHE_ENABLED:
                    PLOT_CACHE[filepath] = data
                return f"https://{bucket_name}.s3.amazonaws.com/{filepath}"

        # Otherwise, fall through to /tmp path fallback below
    except MemoryError:
        # Explicit fallback on memory pressure
        pass
    except Exception as e:
        print(f"Error saving plot to memory, will try /tmp fallback: {e}")
    finally:
        try:
            buf.close()
        except Exception:
            pass

    # Fallback: save directly to Lambda /tmp to avoid holding bytes in RAM
    safe_name = filename.replace('/', '_')
    tmp_candidates = [
        os.path.join('/tmp', os.path.basename(filename)),
        os.path.join('/tmp', safe_name),
    ]
    # Ensure suffix .png for clarity
    tmp_candidates = [p if p.endswith('.png') else p + '.png' for p in tmp_candidates]
    tmp_path = tmp_candidates[0]
    try:
        # Save to tmp as PNG
        fig.savefig(tmp_path, format='png', dpi=dpi, bbox_inches='tight')

        if dev_local:
            # Return logical key; downloader will pick it up from /tmp
            return filepath
        else:
            # Upload to S3 from tmp file (no in-memory buffering)
            s3_client = boto3.client('s3')
            s3_client.upload_file(
                tmp_path,
                bucket_name,
                filepath,
                ExtraArgs={'ContentType': content_type}
            )
            return f"https://{bucket_name}.s3.amazonaws.com/{filepath}"
    except Exception as e:
        print(f"Error saving plot to /tmp: {e}")
        raise
    finally:
        try:
            plt.close(fig)
        except Exception:
            pass

def download_plot_descriptor(filename: str) -> io.BytesIO:
    """
    Returns an in-memory binary stream (BytesIO) for a previously rendered plot.
    Falls back to S3 download or local file only if not found in cache.
    """
    filepath = get_img_filepath(filename)
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name

    # 1) Try in-memory cache
    if filepath in PLOT_CACHE:
        return io.BytesIO(PLOT_CACHE[filepath])

    # 1b) Try /tmp first (works for both dev and prod fallback)
    tmp_base = os.path.basename(filepath)
    tmp_candidates = [
        os.path.join('/tmp', tmp_base),
        os.path.join('/tmp', tmp_base + '.png'),
        os.path.join('/tmp', filepath.replace('/', '_')),
        os.path.join('/tmp', filepath.replace('/', '_') + '.png'),
    ]
    for p in tmp_candidates:
        if os.path.exists(p):
            with open(p, 'rb') as f:
                return io.BytesIO(f.read())

    # 2) If local dev and a file exists (fallback)
    if dev_local:
        candidate_local = f"/tmp/{os.path.basename(filepath)}"
        if os.path.exists(candidate_local):
            with open(candidate_local, 'rb') as f:
                return io.BytesIO(f.read())
        candidate_dev = os.path.join(output_dir, os.path.basename(filepath))
        if os.path.exists(candidate_dev):
            with open(candidate_dev, 'rb') as f:
                return io.BytesIO(f.read())
        raise FileNotFoundError(f"Plot not found in cache or local: {filepath}")

    # 3) Production: fetch from S3 into memory
    s3_client = boto3.client('s3')
    key = filepath  # get_img_filepath returns the S3 key form
    obj = s3_client.get_object(Bucket=bucket_name, Key=key)
    data = obj['Body'].read()
    # Optionally populate cache for subsequent reads
    if PLOT_CACHE_ENABLED:
        PLOT_CACHE[filepath] = data
    return io.BytesIO(data)

def evict_plot_cache(filename: str) -> bool:
    """Remove a plot entry from the in-memory cache, if present. Returns True if removed."""
    filepath = get_img_filepath(filename)
    return PLOT_CACHE.pop(filepath, None) is not None

### ----------------------------------------------- Helper functions -----------------------------------------------------------

def assemble_constraints(nodes, constraints):
    result = {}
    for node, constraint in zip(nodes, constraints):
        if node in result:
            result[node].append(constraint)
        else:
            result[node] = [constraint]
    return result


#Transformation matrix 
def Abeam(self, X1,X2):
    a0 = X2 - X1
    L = np.sqrt(np.matmul(a0,a0))
    n = a0/L
    A = [[n[0], n[1], 0, 0, 0, 0],
            [-n[1], n[0], 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [0, 0, 0, n[0], n[1], 0],
            [0, 0, 0, -n[1], n[0],0],
            [0, 0, 0, 0, 0, 1]]
    return A, L


def saveFigure(self, fig, projectNumber, name):
    filenames=os.listdir("C:/Users/Nicolas/Dropbox/!P - Projekt/")
    
    for names in filenames:
        if names.find(projectNumber) != -1:
            projectFolder = names
            break
    
    fig.savefig("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/" + name + ".png", bbox_inches='tight')


def discretizeSectionForces(self, s, beam, sectionForceType, loadcomb):
    X = s.model.X
    T = s.model.T
    SF = s.loadCombinationsFE[sectionForceType][loadcomb]
    if sectionForceType == 'M': SF = -SF

    discr = s.model.discr

    nrp = 10*discr+1

    X1beam = X[int(T[beam['consistOfelements'][0], 0]),:]
    X2beam = X[int(T[beam['consistOfelements'][-1], 1]),:]

    AAbeam, _ = self.Abeam(X1beam, X2beam)

    AuBeam = np.zeros((2,2))
    for i in range(0,2):
        for j in range(0,2):
            AuBeam[i][j] = AAbeam[i][j]

    xfine_loc = np.array([])  # Displacement storage
    SFfine = np.array([])

    # Fit a cubic spline to the calculated moments
    for d in range(int(len(beam['consistOfelements'])/discr)):

        ele = beam['consistOfelements'][d*discr:d*discr+discr]

        xy = X[T[ele][:,0]]  # positions along the beam
        xy = np.append(xy, [X[T[ele][-1,:]][-1,:]], axis=0)

        #translate to 0,0
        xy = xy - X1beam

        xy_loc = np.dot(AuBeam, np.transpose(xy))
        x_loc = xy_loc[0,:]

        SFp = SF[ele,:][:,0]
        SFp = np.append(SFp, SF[ele[-1],1])

        SFp[abs(SFp) < 10**-6] = 0

        splineM = CubicSpline(x_loc, SFp, bc_type='not-a-knot')

        xfine_loc_temp = np.linspace(x_loc[0], x_loc[-1], nrp)  # positions along the beam for plotting

        SFfine_temp = splineM(xfine_loc_temp)

        xfine_loc = np.append(xfine_loc, xfine_loc_temp[:-1])
        SFfine = np.append(SFfine, SFfine_temp[:-1])


    xfine_loc = np.append(xfine_loc, xfine_loc_temp[-1])
    SFfine = np.append(SFfine, SFfine_temp[-1])

    return xfine_loc, SFfine, AuBeam, X1beam


def fillBetweenMemberAndSectionForce(ax, startCoor, endCoor, XSFs, sectionForceType):
    # Define helper function to calculate orthogonal projection
    def orthogonal_projection(point, slope, intercept):
        x, y = point
        if slope is None:
            # Vertical beam
            return startCoor[0], y
        elif slope == 0:
            # Horizontal beam
            return x, startCoor[1]
        else:
            perp_slope = -1 / slope
            perp_intercept = y - perp_slope * x
            intersect_x = (perp_intercept - intercept) / (slope - perp_slope)
            intersect_y = slope * intersect_x + intercept
            return intersect_x, intersect_y

    # Calculate slope and intercept of the beam line if not vertical
    if startCoor[0] != endCoor[0]:
        slope = (endCoor[1] - startCoor[1]) / (endCoor[0] - startCoor[0])
        intercept = startCoor[1] - slope * startCoor[0]
    else:
        slope = None
        intercept = None

    # Calculate orthogonal projections
    projections = [orthogonal_projection((x, y), slope, intercept) for x, y in zip(XSFs[0, :], XSFs[1, :])]
    proj_x, proj_y = zip(*projections)

    # Create polygons and fill them carefully to avoid overlaps
    for i in range(len(XSFs[0]) - 1):
        poly_x = [XSFs[0, i], XSFs[0, i + 1], proj_x[i + 1], proj_x[i]]
        poly_y = [XSFs[1, i], XSFs[1, i + 1], proj_y[i + 1], proj_y[i]]
        if sectionForceType == 'M':
            color = 'blue' if XSFs[1, i] > proj_y[i] else 'red'
        else:
            color = 'red' if XSFs[1, i] > proj_y[i] else 'blue'
        ax.fill(poly_x, poly_y, color=color, alpha=0.5, edgecolor='none')  # edgecolor='none' removes line borders

    return ax


def fillBetweenMomentsEnvelope(self, ax, startCoor, endCoor, XSFs_min, XSFs_max, sectionForceType):
    if startCoor[0] == endCoor[0]:  # Vertical beam
        # Directly compare x-values because the beam is vertical
        x_beam = startCoor[0]
        # Fill betweenx requires using the vertical line as a reference for filling
        ax.fill_betweenx(XSFs_min[1, :], x_beam, XSFs_max[0, :], where=(XSFs_min[0, :] > x_beam), color='red', alpha=0.5)
        ax.fill_betweenx(XSFs_min[1, :], x_beam, XSFs_max[0, :], where=(XSFs_min[0, :] <= x_beam), color='blue', alpha=0.5)
    else:
        # Horizontal or sloped beam: use interpolation to find the beam's y-values at each x
        beam_line_interp = interp1d([startCoor[0], endCoor[0]], [startCoor[1], endCoor[1]], fill_value="extrapolate")
        xs = np.linspace(min(XSFs_min[0, :].min(), XSFs_max[0, :].min()), max(XSFs_min[0, :].max(), XSFs_max[0, :].max()), num=1000)
        beam_ys = beam_line_interp(xs)

        # Calculate envelopes for min and max moment lines interpolated to the same xs
        min_ys = np.interp(xs, XSFs_min[0, :], XSFs_min[1, :])
        max_ys = np.interp(xs, XSFs_max[0, :], XSFs_max[1, :])

        # Fill between the interpolated values, switching colors at the beam line
        above_beam = np.where((min_ys + max_ys) / 2 >= beam_ys, 'blue', 'red')
        below_beam = np.where((min_ys + max_ys) / 2 < beam_ys, 'blue', 'red')

        ax.fill_between(xs, min_ys, max_ys, where=(min_ys + max_ys) / 2 >= beam_ys, color=above_beam, alpha=0.5)
        ax.fill_between(xs, min_ys, max_ys, where=(min_ys + max_ys) / 2 < beam_ys, color=below_beam, alpha=0.5)

    return ax

    # Function to create a parallel line at a fixed pixel distance
def create_parallel_line(self, x, y, ax, pixel_distance):
    # Convert data points to pixel coordinates
    xy_pixels = ax.transData.transform(np.vstack([x, y]).T)
    xy_pixels[:, 1] += pixel_distance  # Modify y-coordinates in pixel space
    
    # Convert back to data coordinates
    x_data, y_data = ax.transData.inverted().transform(xy_pixels).T
    return x_data, y_data

##==================================================== Plots ===============================================================

def create_sample_plot() -> plt.Figure:
    """
    Creates a sample sine wave plot
    
    Returns:
        matplotlib Figure object
    """
    # Create data
    x = np.linspace(0, 10, 100)
    y = np.sin(x)
    
    # Create the plot
    fig = plt.figure(figsize=(8, 6))
    plt.plot(x, y, 'b-', label='sin(x)')
    plt.xlabel('x')
    plt.ylabel('sin(x)')
    plt.title('Simple Sine Wave')
    plt.grid(True)
    plt.legend()
    
    return fig
    
def URmat(matrix, row_labels, col_labels, color, section, team_id, project_id, report_id):
    """
    Plot a given matrix with:
    - Smooth color transition from white to blue for values from 0 to 1.
    - Includes row and column labels.
    """
    # Define the custom color map for a smooth transition from white to blue
    cmap = mcolors.LinearSegmentedColormap.from_list(
        'custom_cmap',
        ['white', color]
    )
    norm = mcolors.Normalize(vmin=0, vmax=1)

    # Create the plot
    fig, ax = plt.subplots()
    cax = ax.matshow(matrix, cmap=cmap, norm=norm)

    # Set the ticks and labels for rows and columns
    ax.set_xticks(np.arange(len(col_labels)))
    ax.set_yticks(np.arange(len(row_labels)))
    ax.set_xticklabels(col_labels, rotation=45, ha='left')
    ax.set_yticklabels(row_labels)

    # Add the values as text
    for (i, j), val in np.ndenumerate(matrix):
        text_color = 'black' if val < 0.5 else 'white'
        ax.text(j, i, f'{val*100:.0f}%', ha='center', va='center', color=text_color)
        if val > 1:
            rect = plt.Rectangle((j-0.5, i-0.5), 1, 1, color='red')
            ax.add_patch(rect)

    # Add colorbar for reference
    # cbar = fig.colorbar(cax, ticks=[0, 0.5, 1])
    # cbar.ax.set_yticklabels(['0', '0.5', '1'])

    # plt.title("Matrix Plot with White to Blue Transition")
    #plt.show()

    figname = "ULSmatrix" + str(section+1)
    filename = make_figure_filename(team_id, project_id, report_id, figname)
    path = save_plot(fig, filename)
    
    return filename, path

# Example usage with the provided matrix and labels
# URnames = ['UR_Tryk631', 'UR_boejningsmoment625', 'UR_forskydning626', 'UR_kipning632', 'UR_lokaleTvaergaaendeKraefter617']
# URcombnames = ['Nyttelast dominerende', 'Snelast dominerende', 'Vindlast dominerende', 'Kun nyttelaster 1', 'Egenlast dominerende']
# example_matrix = np.random.rand(5, 5)
# example_matrix[2,3] = 1.1
# color = [4/255,10/255,161/255]
# plotURmat(example_matrix, URnames, URcombnames, color)


def staticPlot(model, member, highligtedBeamIndex, team_id, project_id, report_id):
    U = model.U
    X = model.X
    
    fig, ax = plt.subplots()
    #ax = plot.add_subplot(1, 1, 1)
    for i, b in enumerate(member):
        consistOfelements = model.member[i]['consistOfelements'].astype(int)
        startCoor = model.X[model.T[consistOfelements][0][0].astype(int)]
        endCoor = model.X[model.T[consistOfelements][-1][-1].astype(int)]
        if i == highligtedBeamIndex:
            ax.plot([startCoor[0],endCoor[0]], [startCoor[1],endCoor[1]], color = 'r', linewidth=1)
        else:
            ax.plot([startCoor[0],endCoor[0]], [startCoor[1],endCoor[1]], color = 'black', linewidth=1)
        # xp = (X[int(T[el,1]),:] + X[int(T[el,0]),:])/2
        # plt.text(xp[0], xp[1] , f'{el}', color = 'black')
        
    # for no in range(0,nno):
    #     plt.text(X[no,0], X[no,1], f'{no}', color='black', 
    #     bbox=dict(facecolor='white', edgecolor='grey', boxstyle='round,pad=1'))
    no=[]
    con=[]
    for i, nbc in enumerate(U.astype(int)):
        no.append(int(nbc/3))
        con.append(nbc%3)
        
    node_constraints = assemble_constraints(no, con)
    
    dx=ax.get_xlim()[1]-ax.get_xlim()[0]
    dy=ax.get_ylim()[1]-ax.get_ylim()[0]

    for i, node in enumerate(node_constraints.keys()):   
        if node_constraints[node] == [0]:
            ax = supports.roller_support(X[node,0], X[node,1], dx/80, 270, ax)
        elif node_constraints[node] == [1]:
            ax = supports.roller_support(X[node,0], X[node,1], dx/80, 0, ax)
        elif node_constraints[node] == [0, 1] or node_constraints[node] == [1, 0]:
            ax = supports.simple_support(X[node,0], X[node,1], dx/80, 0, ax)
 
    
    ax.set_aspect('equal', adjustable='box')
    ax.margins(0.25,0.25)
    plt.grid()  
    
    # if dx < 2:
    #ax.set_xlim(ax.get_xlim()[0]-2,ax.get_xlim()[1]+2)
    # if dy < 2:
    #ax.set_ylim((ax.get_ylim()[0]-2,ax.get_ylim()[1]+2))
    figname = "statisksystem" + str(highligtedBeamIndex+1)
    filename = make_figure_filename(team_id, project_id, report_id, figname)
    path = save_plot(fig, filename)
    
    return filename, path



def sectionForce(self, s, model, member, projectNumber, forceType, loadcomb):
    U = model.U
    X = model.X
    
    plot = plt.figure()
    plt.clf()
    ax = plot.add_subplot(1, 1, 1)
    
    M = s.loadCombinationsFE[forceType][loadcomb]
    max_moment = np.max(np.abs(M))  # Using absolute values to get the largest magnitude
    
    for i, b in enumerate(member):
        startCoor = model.X[model.T[member[i].beam['consistOfelements']][0][0]]
        endCoor = model.X[model.T[member[i].beam['consistOfelements']][-1][-1]]

        # Plot the beam
        ax.plot([startCoor[0],endCoor[0]], [startCoor[1],endCoor[1]], color = 'black', linewidth=0.8)
        
    

    for i in range(np.size(model.T,0)):
        beam_nodes = model.T[i,:]
        beam_coords = model.X[beam_nodes]
        
        # Extract moments for these nodes
        beam_moments = M[i,:]
        
        beam_moments = -1*beam_moments
        

        

    
        # Interpolate moments along the beam
        # You might need to adjust this part based on your actual moment distribution
        linear_dist = np.linspace(0, 1, len(beam_nodes))
        moment_interpolator = interp1d(linear_dist, beam_moments, kind='linear')
        fine_dist = np.linspace(0, 1, 10)  # More points for a smoother curve
        fine_moments = moment_interpolator(fine_dist)
    
        # Normalize and scale the moments for plotting
        fine_moments_normalized = fine_moments/max_moment*0.5
    
        # Calculate points for the moment curve
        moment_curve_points = []
        for dist in fine_dist:
            # Interpolate for each dimension separately
            x_interp = np.interp(dist, linear_dist, beam_coords[:, 0])
            y_interp = np.interp(dist, linear_dist, beam_coords[:, 1])
    
            # Combine the interpolated x, y coordinates
            point = np.array([x_interp, y_interp])
    
            # Calculate a perpendicular vector for the moment line
            beam_vector = beam_coords[-1] - beam_coords[0]
            perp_vector = np.array([-beam_vector[1], beam_vector[0]])
            perp_vector /= np.linalg.norm(perp_vector)
    
            # Calculate moment point
            moment_index = np.where(fine_dist == dist)[0][0]
            moment_point = point + perp_vector * fine_moments_normalized[moment_index]
            moment_curve_points.append(moment_point)
    
        moment_curve_points = np.array(moment_curve_points)
    
        # Plot the moment curve
        ax.plot(moment_curve_points[:, 0], moment_curve_points[:, 1], color='r', linestyle='--', linewidth=0.8)
        
    no=[]
    con=[]
    for i, nbc in enumerate(U):
        no.append(int(nbc/3))
        con.append(nbc%3)
        
    node_constraints = assemble_constraints(no, con)
    
    dx=ax.get_xlim()[1]-ax.get_xlim()[0]
    dy=ax.get_ylim()[1]-ax.get_ylim()[0]

    for i, node in enumerate(node_constraints.keys()):   
        if node_constraints[node] == [0]:
            ax = supports.roller_support(X[node,0], X[node,1], dx/20, 270, ax)
        elif node_constraints[node] == [1]:
            ax = supports.roller_support(X[node,0], X[node,1], dx/20, 0, ax)
        elif node_constraints[node] == [0, 1] or node_constraints[node] == [1, 0]:
            ax = supports.simple_support(X[node,0], X[node,1], dx/20, 0, ax)
    
    ax.set_aspect('equal', adjustable='box')
    ax.margins(0.25,0.25)  
    
    # if dx < 2:
    #ax.set_xlim(ax.get_xlim()[0]-2,ax.get_xlim()[1]+2)
    # if dy < 2:
    #ax.set_ylim((ax.get_ylim()[0]-2,ax.get_ylim()[1]+2))
    
    plt.grid()
    
    filenames=os.listdir("C:/Users/Nicolas/Dropbox/!P - Projekt/")
    
    for names in filenames:
        if names.find(projectNumber) != -1:
            projectFolder = names
            break

    plt.savefig("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/" + forceType + "plot.png", bbox_inches='tight')
    
    
def sectionForceColor(self, s, model, member, projectNumber, forceType, loadcomb):
    U = model.U
    X = model.X
    
    plot = plt.figure()
    plt.clf()
    ax = plot.add_subplot(1, 1, 1)
    
    M = s.loadCombinationsFE[forceType][loadcomb]
    
    discrFactor = 2
    T_discr, X_discr = discretize.discretize_beam_coordinates(model.T, model.X, discrFactor)
    M_discr = discretize.discretize_moments(M, model.T, discrFactor)
    
    max_moment = np.max(M)  # Using absolute values to get the largest magnitude
    min_moment = np.min(M)  # Using absolute values to get the largest magnitude
    
    # Use TwoSlopeNorm for normalization to handle both positive and negative moments
    # if min_moment < 0 and max_moment
    if min_moment < 0 and max_moment > 0:
        norm = TwoSlopeNorm(vmin=min_moment, vcenter=0, vmax=max_moment)
    elif max_moment > 0:
        norm = Normalize(vmin=-max_moment, vmax=max_moment)
    elif min_moment < 0:
        norm = Normalize(vmin=min_moment, vmax=-min_moment)
    else:
        norm = Normalize(vmin=0, vmax=0)
        
    cmap = plt.get_cmap('coolwarm')  # Use 
    # else:
    #     norm = Normalize(vmin=min_moment, vmax=max_moment)
    #     cmap = plt.get_cmap('coolwarm')  # Use 
    
    all_segments = []
    all_colors = []
    
    M_discr_normalized = norm(M_discr)

    for i in range(len(T_discr)):
        for j in range(len(T_discr[i]) - 1):
            start_idx = T_discr[i][j]
            end_idx = T_discr[i][j + 1]
            segment = [X_discr[start_idx], X_discr[end_idx]]
            all_segments.append(segment)

            # Assuming M_discr_normalized is structured to correspond with segments
            moment_value = M_discr_normalized[i][j]
            color = cmap(moment_value)
            all_colors.append(color)
        
    # Create LineCollection
    line_collection = LineCollection(all_segments, colors=all_colors, linewidth=4)
    ax.add_collection(line_collection)

    # Add a colorbar to the figure
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    plt.colorbar(sm, ax=ax, orientation='vertical', label='Magnitude')

    no=[]
    con=[]
    for i, nbc in enumerate(U):
        no.append(int(nbc/3))
        con.append(nbc%3)
        
    node_constraints = assemble_constraints(no, con)
    
    dx=ax.get_xlim()[1]-ax.get_xlim()[0]
    dy=ax.get_ylim()[1]-ax.get_ylim()[0]

    for i, node in enumerate(node_constraints.keys()):   
        if node_constraints[node] == [0]:
            ax = supports.roller_support(X[node,0], X[node,1], dx/20, 270, ax)
        elif node_constraints[node] == [1]:
            ax = supports.roller_support(X[node,0], X[node,1], dx/20, 0, ax)
        elif node_constraints[node] == [0, 1] or node_constraints[node] == [1, 0]:
            ax = supports.simple_support(X[node,0], X[node,1], dx/20, 0, ax)
    
    ax.set_aspect('equal', adjustable='box')
    ax.margins(0.25,0.25)  
    
    # if dx < 2:
    #ax.set_xlim(ax.get_xlim()[0]-2,ax.get_xlim()[1]+2)
    # if dy < 2:
    #ax.set_ylim((ax.get_ylim()[0]-2,ax.get_ylim()[1]+2))
    
    plt.grid()
    
    filenames=os.listdir("C:/Users/Nicolas/Dropbox/!P - Projekt/")
    
    for names in filenames:
        if names.find(projectNumber) != -1:
            projectFolder = names
            break

    plt.savefig("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/" + forceType + "colorPlot.png", bbox_inches='tight')
    
    
#---------------------------Displacement and Section force functions -----------------------------------

def getDeformation(self, beam):
    X = self.X
    T = self.T
    D = self.D
    V = self.V

    # Coordinates plus deformations
    nrp = 5

    plt.clf()
    Dplot = plt.figure(1)
    ax = Dplot.add_subplot(1, 1, 1)

    # Define the cubic Hermite shape functions for displacement and rotation
    def N1(s): return 1 - 3*s**2 + 2*s**3
    def N2(s): return L * (s - 2*s**2 + s**3)
    def N3(s): return 3*s**2 - 2*s**3
    def N4(s): return L * (-s**2 + s**3)

    for el in beam['consistOfelements']:
        # Plot the initial undeformed beam
        ax.plot([X[int(T[el, 0]), 0], X[int(T[el, 1]), 0]],
                [X[int(T[el, 0]), 1], X[int(T[el, 1]), 1]], '--', color='black')

        # Create transformation matrix
        no1 = int(T[el, 0])
        no2 = int(T[el, 1])
        X1 = X[no1, :]
        X2 = X[no2, :]
        A, L = self.Abeam(X1, X2)

        Au = np.zeros((2,2))
        for i in range(0,2):
            for j in range(0,2):
                Au[i][j] = A[i][j]

        # Get global deformations
        v = np.zeros(6)
        for i in range(6):
            v[i] = V[int(D[el, i])]

        # make local deformations
        v = np.matmul(A, v)

        Xs = np.zeros((2, nrp))
        Us = np.zeros(nrp)  # Displacement storage
        for i in range(nrp):
            s = i / (nrp - 1)
            Us[i] = N1(s)*v[1]+N2(s)*v[2]+N3(s)*v[4]+N4(s)*v[5]
            scaleU = 40
            Xs[:, i] = X1 * (1 - s) + X2 * s + scaleU * np.dot(np.transpose(Au),[0,Us[i]])
        # Plot deformations
        ax.plot(Xs[0, :], Xs[1, :], color='b')

    ax.set_aspect('equal', adjustable='box')
    ax.margins(0.05, 0.05)
    ax.set_title("Deformation")
    ax.set_aspect('equal', adjustable='box')
    plt.show()
    plt.draw()



def plotSectionForcesGlobal(self, s, ECmembers, projectNumber, sectionForceType, loadcomb, save=True):

    fig, ax = self.staticPlot(s.model, ECmembers, 'none', projectNumber, save=False)

    scale = 1/np.max(np.abs(s.loadCombinationsFE[sectionForceType][loadcomb]))*np.max([np.max(s.model.X[:,0])-np.min(s.model.X[:,0]),np.max(s.model.X[:,1])-np.min(s.model.X[:,1])])/6

    for i, b in enumerate(ECmembers):
    
        beam = b.beam

        xfine_loc, SFfine, AuBeam, X1beam = self.discretizeSectionForces(s, beam, sectionForceType, loadcomb)

        XY = np.dot(np.transpose(AuBeam), [xfine_loc,scale*SFfine])

        start = np.empty([2,1])
        start[0,:] = X1beam[0]
        start[1,:] = X1beam[1]

        XSFs = np.tile(start, (1, np.size(XY,1))) + XY
        #XSFsFE = np.dot(np.transpose(AuBeam),[x_loc,scaleM*SFp])

        ax.plot(XSFs[0,:], XSFs[1,:], color='r')
        #ax.plot(XSFsFE[0,:], XSFsFE[1,:], color='brown', marker='o', linestyle='None')

        startCoor = s.model.X[s.model.T[beam['consistOfelements']][0][0]]
        endCoor = s.model.X[s.model.T[beam['consistOfelements']][-1][-1]]

        ax = self.fillBetweenMemberAndSectionForce(ax, startCoor, endCoor, XSFs, sectionForceType)

    plt.show()
    
    if save:
        name = "SectionForce - " + sectionForceType + " - " + loadcomb
        self.saveFigure(fig, projectNumber, name)


def plotSectionForcesMember(s, member, ls, loadcomb, team_id, project_id, report_id):

    # Create custom patches for the legend
    red_patch = mpatches.Patch(color='red', alpha=0.5, label='+')
    blue_patch = mpatches.Patch(color='blue', alpha=0.5, label='$-$')

    global_min_x = float('inf')
    global_max_x = float('-inf')
    global_min_y = float('inf')
    global_max_y = float('-inf')

    consistOfelements = member['consistOfelements'].astype(int)

    startCoor = s.X_discr[int(s.T_discr[consistOfelements][0][0].astype(int))]
    endCoor = s.X_discr[int(s.T_discr[consistOfelements][-1][-1].astype(int))]

    fig, axs = plt.subplots(nrows=1, ncols=3, figsize=(14, 5), sharex=True)

    SFtypes = ['M', 'F2', 'F1']
    titles = ['Moment [kNm]', 'Forskydning [kN]', 'Normal [kN]']
    xlabels = ['x-koordinat [m]', 'x-koordinat [m]', 'x-koordinat [m]']

    for ax, sectionForceType in zip(axs, SFtypes):
        plotOnlyMax = False
        plotOnlyMin = False

        ax.plot([startCoor[0],endCoor[0]], [startCoor[1],endCoor[1]], color = 'black', linewidth=1)

        #xfine_loc, SFfine, AuBeam, X1beam = self.discretizeSectionForces(s, beam, sectionForceType, loadcomb)
        flattened_index = np.concatenate([
        row[:-1] if i < len(s.T_discr[consistOfelements]) - 1 else row  # Exclude last element for all rows except the last
        for i, row in enumerate(s.T_discr[consistOfelements])
        ]).flatten().astype(int)

        if not s.loadCombinationsFE_discr[ls][sectionForceType][loadcomb].any():
                continue
        
        SFfine = s.loadCombinationsFE_discr[ls][sectionForceType][loadcomb][flattened_index]

        # Robust scaling: avoid divide-by-zero and NaNs when SFfine is all zeros
        max_abs = np.max(np.abs(SFfine)) if SFfine.size else 0.0
        if max_abs <= 1e-12:
            scale = 0.0
        else:
            scale = (1.0 / max_abs) * member['L'] / 6.0
        x_loc_discr = s.X_loc_discr[flattened_index]
        XY = np.dot(np.transpose(member['AuBeam']), [x_loc_discr, scale * SFfine])


        max_SF_idx = np.argmax(SFfine)
        min_SF_idx = np.argmin(SFfine)
        max_SF = SFfine[max_SF_idx]*10**-3
        min_SF = SFfine[min_SF_idx]*10**-3
        if abs(max_SF) < 10**-3: max_SF = 0
        if abs(min_SF) < 10**-3: min_SF = 0

        if max_SF != 0:
            if abs((max_SF - min_SF)/max_SF) < 0.05: #If the difference between the max and min is less than 5% of the max value
                if abs(max_SF) > abs(min_SF):
                    plotOnlyMax = True
                else:
                    plotOnlyMin = True


        # Convert values to string with comma as decimal separator
        if sectionForceType == 'M':
            max_SF_str = f"{-max_SF:.2f}".replace('.', ',')
            min_SF_str = f"{-min_SF:.2f}".replace('.', ',')
            if max_SF > 0:
                max_color = 'blue'
            else:
                max_color = 'red'

            if min_SF < 0:
                min_color = 'red'
            else:
                min_color = 'blue'
        else:
            max_SF_str = f"{max_SF:.2f}".replace('.', ',')
            min_SF_str = f"{min_SF:.2f}".replace('.', ',')
            if max_SF > 0:
                max_color = 'red'
            else:
                max_color = 'blue'

            if min_SF < 0:
                min_color = 'blue'
            else:
                min_color = 'red'

        start = np.array([[member['X1beam'][0]], [member['X1beam'][1]]])     

        XSFs = start + XY
        #XSFs_beam = np.tile(start, (1, np.size(XY_beam,1))) + XY_beam

        ax.plot(XSFs[0,:], XSFs[1,:], color='grey', alpha=0.5, zorder=1)

        XY_dashed_beam = np.dot(np.transpose(member['AuBeam']), np.array([np.array([x_loc_discr[0],x_loc_discr[-1]]),np.zeros(2)-member['L']/100])) + start
        ax.plot([XY_dashed_beam[0,0],XY_dashed_beam[0,-1]], [XY_dashed_beam[1,0],XY_dashed_beam[1,-1]], color = 'black', linewidth=1, linestyle='--')

        if sectionForceType == 'M':
            if plotOnlyMax:
                ax.scatter(XSFs[0,max_SF_idx], XSFs[1,max_SF_idx], color=max_color, zorder=3)
                ax.annotate(max_SF_str, (XSFs[0,max_SF_idx], XSFs[1,max_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
            elif plotOnlyMin:
                ax.scatter(XSFs[0,min_SF_idx], XSFs[1,min_SF_idx], color=min_color, zorder=3)
                ax.annotate(min_SF_str, (XSFs[0,min_SF_idx], XSFs[1,min_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
            else:
                ax.scatter(XSFs[0,max_SF_idx], XSFs[1,max_SF_idx], color=max_color, zorder=3)
                ax.annotate(max_SF_str, (XSFs[0,max_SF_idx], XSFs[1,max_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
                ax.scatter(XSFs[0,min_SF_idx], XSFs[1,min_SF_idx], color=min_color, zorder=3)
                ax.annotate(min_SF_str, (XSFs[0,min_SF_idx], XSFs[1,min_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
        else:
            if plotOnlyMax:
                ax.scatter(XSFs[0,max_SF_idx], XSFs[1,max_SF_idx], color=max_color, zorder=3)
                ax.annotate(max_SF_str, (XSFs[0,max_SF_idx], XSFs[1,max_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
            elif plotOnlyMin:
                ax.scatter(XSFs[0,min_SF_idx], XSFs[1,min_SF_idx], color=min_color, zorder=3)
                ax.annotate(min_SF_str, (XSFs[0,min_SF_idx], XSFs[1,min_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
            else:
                ax.scatter(XSFs[0,max_SF_idx], XSFs[1,max_SF_idx], color=max_color, zorder=3)
                ax.annotate(max_SF_str, (XSFs[0,max_SF_idx], XSFs[1,max_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)
                ax.scatter(XSFs[0,min_SF_idx], XSFs[1,min_SF_idx], color=min_color, zorder=3)
                ax.annotate(min_SF_str, (XSFs[0,min_SF_idx], XSFs[1,min_SF_idx]), textcoords="offset points", xytext=(0,10), ha='center', fontsize=15, zorder=4)

        ax = fillBetweenMemberAndSectionForce(ax, startCoor, endCoor, XSFs, sectionForceType)

        # Extend the bounds to include the start and end coordinates
        global_min_x = min(global_min_x, startCoor[0], endCoor[0], np.min(XSFs[0,:]))
        global_max_x = max(global_max_x, startCoor[0], endCoor[0], np.max(XSFs[0,:]))
        global_min_y = min(global_min_y, startCoor[1], endCoor[1], np.min(XSFs[1,:]))
        global_max_y = max(global_max_y, startCoor[1], endCoor[1], np.max(XSFs[1,:]))

        #Få centreret bjælken i midten og ens på alle figurer!!!
        #Hvad med at vise underkant med stiplet linje
        #

    if global_max_x - global_min_x > global_max_y - global_min_y:
        global_min_y0 = (global_max_y + global_min_y) / 2 - (global_max_x - global_min_x) / 2
        global_max_y0 = (global_max_y + global_min_y) / 2 + (global_max_x - global_min_x) / 2
        global_min_y = global_min_y0
        global_max_y = global_max_y0
    else:
        global_min_x0 = (global_max_x + global_min_x) / 2 - (global_max_y - global_min_y) / 2
        global_max_x0 = (global_max_x + global_min_x) / 2 + (global_max_y - global_min_y) / 2
        global_min_x = global_min_x0
        global_max_x = global_max_x0 

    # Add some margin
    x_margin = (global_max_x - global_min_x) * 0.1
    y_margin = (global_max_y - global_min_y) * 0.1

    global_min_x -= x_margin
    global_max_x += x_margin
    global_min_y -= y_margin
    global_max_y += y_margin


    for ax, xlabel, title in zip(axs, xlabels, titles):
        ax.set_aspect('equal', adjustable='box')
        ax.set_xlim([global_min_x, global_max_x])
        ax.set_ylim([global_min_y, global_max_y])
        ax.set_xlabel(xlabel)
        ax.set_title(title)
        ax.legend(handles=[red_patch, blue_patch], loc='best')  # `loc='best'` finds the best location for the legend not to overlap data
        ax.grid()
        ax.grid(which='major', linestyle='-', linewidth='0.5', color='black', alpha=0.5)

    axs[0].set_ylabel('y-koordinat [m]')
    plt.tight_layout()
    #plt.show()

    figname = "Member" + loadcomb
    filename = make_figure_filename(team_id, project_id, report_id, figname)
    path = save_plot(fig, filename)
    
    return filename, path


def plotSectionForcesMemberEnvelope(s, member, ls, team_id, project_id, report_id):

    # Definer en formatter funktion, der ganger inputværdier med -1
    def negative_formatter(x, pos):
        return f"{-x:.0f}"

    filename = [None] * len(s.member_discr)
    path = [None] * len(s.member_discr)

    consistOfelements = member['consistOfelements'].astype(int)

    startCoor = s.X_discr[int(s.T_discr[consistOfelements][0][0])]
    endCoor = s.X_discr[int(s.T_discr[consistOfelements][-1][-1])]

    fig, axs = plt.subplots(nrows=3, ncols=1, figsize=(10, 5), sharex=True)

    # Anvend formatteren til y-aksen i det første subplot
    axs[0].yaxis.set_major_formatter(FuncFormatter(negative_formatter))

    #ax = plot.add_subplot(1, 1, 1)
    #scale = 1/np.max(np.abs(collect))*beam['L']/6
    SFtypes = ['M', 'F2', 'F1']
    #titles = ['Moment', 'Forskydning', 'Normal']
    ylabels = ['Moment [kNm]', 'Forskydning [kN]', 'Normal [kN]']
    for ax, SFtype, ylabel in zip(axs, SFtypes, ylabels):

        SF = s.loadCombinationsFE_discr[ls][SFtype]

        flattened_index = np.concatenate([
        row[:-1] if i < len(s.T_discr[consistOfelements]) - 1 else row  # Exclude last element for all rows except the last
        for i, row in enumerate(s.T_discr[consistOfelements])
        ]).flatten().astype(int)

        SFfine_all = []
        for loadcomb in SF.keys():
            #xfine_loc, SFfine, AuBeam, X1beam = self.discretizeSectionForces(s, beam, SFtype, loadcomb)

            # if not SF[loadcomb].any():
            #     continue
            
            SFfine = SF[loadcomb][flattened_index]
            SFfine_all.append(SFfine)

        SFfine_all = np.vstack(SFfine_all)*10**-3  # Convert to kN or kNm
        minEnvelope = np.min(SFfine_all, axis=0)
        maxEnvelope = np.max(SFfine_all, axis=0)

        ax.plot(s.X_loc_discr[flattened_index], minEnvelope, 'b', linewidth=0.8)
        ax.plot(s.X_loc_discr[flattened_index], maxEnvelope, 'b', linewidth=0.8)
        ax.fill_between(s.X_loc_discr[flattened_index], minEnvelope, maxEnvelope, color='gray', alpha=0.2)

        mem_local = np.dot(member['AuBeam'], np.transpose([startCoor,endCoor]-member['X1beam']))
        mem_local[abs(mem_local) < 10**-6] = 0
        ax.plot([mem_local[0,0],mem_local[0,1]], [mem_local[1,0],mem_local[1,1]], color = 'black', linewidth=1.2, linestyle='-')
        ax.grid()
        # Aktiver minor ticks
        ax.minorticks_on()
        ax.yaxis.set_minor_locator(AutoMinorLocator(5))  # Antallet af minor ticks mellem hver major tick

        # Juster grid
        ax.grid(which='major', linestyle='-', linewidth='0.5', color='black', alpha=0.5)
        ax.grid(which='minor', linestyle=':', linewidth='0.5', color='gray')
        #ax.set_title(title)
        ax.set_ylabel(ylabel)

        # Create and plot parallel line
        # x_parallel, y_parallel = self.create_parallel_line([mem_local[0,0],mem_local[0,1]], [mem_local[1,0],mem_local[1,1]], ax, pixel_distance=100)  # 10 pixels distance
        # ax.plot(x_parallel, y_parallel, label='Parallel Line', linestyle='--')
        if (ax.get_ylim()[1]-ax.get_ylim()[0]) < 10:
            ax.set_ylim(1,-1)

        dashed_dist = (ax.get_ylim()[1]-ax.get_ylim()[0])/40
        ax.plot([mem_local[0,0],mem_local[0,1]], [mem_local[1,0],mem_local[1,1]]-dashed_dist, color = 'black', linewidth=1, linestyle='--')

    #ax = self.fillBetweenMomentsEnvelope(ax, startCoor, endCoor, XSFs_min, XSFs_max, sectionForceType)
    axs[-1].set_xlabel('Lokalt x-koordinat [m]')
    #ax.margins(0.25,0.25)
    plt.tight_layout()
    #plt.show()

    figname = "MemberSectionForceEnvelope"
    filename = make_figure_filename(team_id, project_id, report_id, figname)
    path = save_plot(fig, filename)
    
    return filename, path

