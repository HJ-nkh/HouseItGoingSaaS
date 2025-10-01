from typing import Optional
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
import src.plots as plots
import os
import uuid
import io
import boto3
import numpy as np
import json
import zipfile
import re
from plots import download_plot_descriptor
from PIL import Image
from Steel_fire import steeltempfire

# --- Minimal adapter to use serialized JSON structure with attribute access ---
class _AttrDict(dict):
    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError as e:
            raise AttributeError(item) from e
    def __setattr__(self, key, value):
        self[key] = value
    def __delattr__(self, item):
        try:
            del self[item]
        except KeyError as e:
            raise AttributeError(item) from e

def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)

def _should_to_ndarray(lst):
    if not isinstance(lst, list) or not lst:
        return False
    # Do not convert if any element is a dict-like structure
    if any(isinstance(e, (dict, _AttrDict)) for e in lst):
        return False
    # Flat numeric list
    if all(_is_number(e) for e in lst):
        return True
    # 2D numeric list with consistent inner lengths
    if all(isinstance(e, (list, tuple)) and e and all(_is_number(v) for v in e) for e in lst):
        first_len = len(lst[0])
        if all(len(e) == first_len for e in lst):
            return True
    return False

def _wrap_struct(obj):
    if isinstance(obj, dict):
        return _AttrDict({k: _wrap_struct(v) for k, v in obj.items()})
    if isinstance(obj, list):
        if _should_to_ndarray(obj):
            try:
                return np.array(obj, dtype=float)
            except Exception:
                return np.array(obj)
        return [_wrap_struct(x) for x in obj]
    return obj

is_development = os.environ.get('API_ENV', 'production') == 'development'

'''
A report has file name format: {team_id}/{project_id}/{report_id}.docx
'''

def itanum(x):
    try:
        num = format(int(x),',d').replace(",", ".")
    except:
        num = 'NOT CONVERTED'
    return num

def num2deci(x):
    return "{:.2f}".format(round(x,2)).replace(".",",")

def num2percent(x):
    return "{} %".format(int(round(x * 100))).replace(".", ",")

def ignore(x):
    try:
        return x*1
    except:
        return '!'
    
def make_report_filename(team_id, project_id, report_id):
    return f"{team_id}/{project_id}/{report_id}.docx"

def _sanitize_filename_base(name: str, default: str = 'report') -> str:
    """Sanitize a string to be safe for filenames (keeps letters, numbers, . _ -, and Danish æøåÆØÅ)."""
    try:
        s = name if isinstance(name, str) else ('' if name is None else str(name))
    except Exception:
        s = ''
    s = s.strip()
    s = re.sub(r'\s+', '-', s)
    # Allow ASCII letters/digits plus dot, underscore, hyphen, and Danish letters æøåÆØÅ
    s = re.sub(r'[^A-Za-z0-9._ÆØÅæøå-]+', '', s)
    return s or default

def create_report(s, team_id, project_id, title: str | None = None):

    def get_template_path(reportName: str) -> str   :
        # Resolve template relative to this file so script can be run from repo root or lambda root
        here = os.path.dirname(__file__)
        candidate_paths = [
            os.path.join(here, 'report_templates', f'{reportName}.docx'),               # src/report_template_steel.docx
            os.path.join(os.getcwd(), 'src', 'report_templates', f'{reportName}.docx'), # CWD/src/report_template_steel.docx
        ]
        template_path = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Report template not found. Looked in: {candidate_paths}")

        return template_path

    # Normalize encoded_s input (can be dict, JSON string, or legacy forms)
    def _normalize_state(payload):
        # Helpful type log for diagnostics (safe/no secrets)
        try:
            print(f"[create_report] normalize incoming type={type(payload).__name__}")
        except Exception:
            pass

        if payload is None:
            raise ValueError("encoded_s is None")

        # If payload is a JSON string, parse it
        if isinstance(payload, str):
            # Try to parse JSON string first
            try:
                parsed = json.loads(payload)
                payload = parsed
            except Exception:
                # Likely a legacy base64 pickle or malformed
                raise ValueError("encoded_s is a string and not valid JSON; this looks like a legacy blob. Re-run the simulation to produce JSON state.")

        if isinstance(payload, dict):
            # Handle our current schema first
            if 'state' in payload and isinstance(payload['state'], (dict, list)):
                return payload['state']
            # Back-compat with older test harnesses
            if 's' in payload and isinstance(payload['s'], (dict, list)):
                return payload['s']
            # Detect hard legacy marker we used during migration
            if 'legacy_base64_pickle' in payload:
                raise ValueError("encoded_s contains legacy_base64_pickle. Re-run the simulation to generate JSON state.")
            # If it already looks like a plain state object, return as-is
            return payload

        # Unexpected type
        raise TypeError(f"Unsupported encoded_s type: {type(payload).__name__}")

    # Produce attribute-access wrapper for state
    state = _normalize_state(s)
    s = _wrap_struct(state)

    # Access project (will raise AttributeError if missing)
    project = getattr(s, 'project', None)
    if project is None:
        raise KeyError("State missing 'project' section after normalization. Ensure simulation stores project in encoded_s.state.project")
        
    #member = s.member
    ECmembers = s.loadCombinations[list(s.loadCombinations.keys())[0]]
    ECmembers = ECmembers[list(ECmembers.keys())[0]]


    #plots.plotSectionForcesGlobal(s, ECmembers, project.projectNumber, 'M', loadcombPlots)

    #plots.sectionForceColor(s, s.model, ECmembers, project.projectNumber, 'F1', loadcombPlots)
    # plots.sectionForceColor(s, s.model, ECmembers, project.projectNumber, 'F2', loadcombPlots)
    # plots.sectionForceColor(s, s.model, ECmembers, project.projectNumber, 'M', loadcombPlots)

    reports: list[dict] = []
    zip_entries: list[tuple[str, bytes]] = []

    for i, m in enumerate(ECmembers):

        report_id = str(uuid.uuid4())

        context = {}
        # Collect all plot filenames for this member; we'll evict cache once after rendering/saving
        image_filenames: list[str] = []

        # Preserve the original member beam name for file naming (before any reassignment to m below)
        member_beamname = _sanitize_filename_base(str(m.beamname), f'member-{i+1}')

        membertype = m.beamtype
        memberprop = m.beamprop
        
        last = []
        for ii in range(s.numOfLoads):
            if (s.coor2[ii][0] is None or s.coor2[ii][1] is None) and not (s.coor2[ii][0] is None and s.coor2[ii][1] is None): #punktlast
                last.append({'laster' : s.loadtypes[ii],
                                    'enhed' : 'kN',
                                    'lasttype' : 'Punktlast',
                                    'coor1' : str(s.coor1[ii]),
                                    'coor2' : ' - ',
                                    'Fx1' : str(num2deci(s.Fxy1[ii][0]*10**-3)),
                                    'Fx2' : ' - ',
                                    'Fy1' : str(num2deci(s.Fxy1[ii][1]*10**-3)),
                                    'Fy2' : ' - '})
            elif not (s.coor2[ii][0] is None and s.coor2[ii][1] is None):
                last.append({'laster' : s.loadtypes[ii],
                                    'enhed' : 'kN/m',
                                    'lasttype' : 'Linjelast',
                                    'coor1' : str(s.coor1[ii]),
                                    'coor2' : str(s.coor2[ii]),
                                    'Fx1' : str(num2deci(s.Fxy1[ii][0]*10**-3)),
                                    'Fx2' : str(num2deci(s.Fxy2[ii][0]*10**-3)),
                                    'Fy1' : str(num2deci(s.Fxy1[ii][1]*10**-3)),
                                    'Fy2' : str(num2deci(s.Fxy2[ii][1]*10**-3))})
        
        if membertype == 'Stål':
            if 'HE' in memberprop['profile'] or 'IP' in memberprop['profile'] or 'UN' in memberprop['profile']:
                if 'HE' in memberprop['profile'] or 'IP' in memberprop['profile']:
                    
                    reportType = 'beam_steel'
                    template_path = get_template_path(reportType)
                    doc = DocxTemplate(template_path)

                elif 'UN' in memberprop['profile']:
                    
                    reportType = 'beam_steel_UNP'
                    template_path = get_template_path(reportType)
                    doc = DocxTemplate(template_path)

                context.update({'last' : last,
                            'Adresse' : project.address,
                            'Projektnummer' : project.projectNumber,
                            'navn_bjaelke' : str(m.beamname),
                            'L' : num2deci(m.L),
                            'profil' : str(memberprop['profile']).replace('.',','),
                            'tvaersnitsklasse' : str(m.tvaersnitsklasse).replace('.',','),
                            'konsekvensklasse' : str(s.konsekvensklasse).replace('.',','),
                            'KFi' : str(s.KFi).replace('.',','),
                            'b' : itanum(m.b*1000),
                            'h' : itanum(m.h*1000),
                            'd' : itanum(m.d*1000),
                            't' : itanum(m.t*1000),
                            'A' : itanum(m.A*10**6),
                            'r' : itanum(m.r*1000),
                            'g' : num2deci(m.g),
                            'totalweight' : itanum(m.totalweight),
                            'I_y' : itanum(m.beam['I']*10**12),
                            'I_z' : itanum(m.I_z*10**12),
                            'I_v' : itanum(m.I_v*10**12),
                            'I_w' : itanum(m.I_w*10**18),
                            'W_el' : itanum(m.W_ely*10**9),
                            'W_pl' : itanum(m.W_pl*10**9),
                            'staalkval' : m.steelgrade,
                            'E' : itanum(m.E*10**-9),
                            'G' : itanum(m.G*10**-9),
                            'rho' : itanum(m.rho),
                            'gamma_M0' : num2deci(m.gamma_M0),
                            'gamma_M1' : num2deci(m.gamma_M1),
                            'nyttelast_linje' : 'OST',
                            'nyttelast_punkt' : 'OST',
                            'snelast_linje' : 'OST',
                            'snelast_punkt' : 'OST',
                            'vindlast_linje' : 'OST',
                            'vindlast_punkt' : 'OST',
                            'egenlast_linje' : 'OST',
                            'egenlast_punkt' : 'OST',
                            'ULS_nyttelast' : 'OST',
                            'SLS_nyttelast' : 'OST',
                            'ULS_snelast' : 'OST',
                            'SLS_snelast' : 'OST',
                            'ULS_vindlast' : 'OST',
                            'SLS_vindlast' : 'OST',
                            'f_y_flange' : itanum(m.f_y_flange*10**-6),  
                            'f_y_krop' : itanum(m.f_y_krop*10**-6)})
                
                # ------------------------------------ Bøjning ----------------------------------------------#                
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Bøjningsmoment - DS/EN 1993-1-1 6.2.5']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]
                UR_boejningsmoment625 = m.UR_boejningsmoment625

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftBojning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                #image_paths['IMGsnitkraftBojning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                
                context.update({'critLoadCombBoejning' : critLoadComb,                                                               
                            'M_cRd' : num2deci(m.M_cRd*10**-3),
                            'M_Ed' : num2deci(m.M_Ed*10**-3),
                            'UR_boejning625' : num2percent(m.UR_boejningsmoment625)})
                
                # ------------------------------------ Forskydning ----------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Forskydning - DS/EN 1993-1-1 6.2.6']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]
                UR_forskydning626 = m.UR_forskydning626

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftForskydning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                
                context.update({'critLoadCombForskydning' : critLoadComb, 
                            'A_v' : num2deci(m.A_v*10**6),
                            'V_plRd' : num2deci(m.V_plRd*10**-3),
                            'V_cRd' : num2deci(m.V_cRd*10**-3),
                            'V_Ed' : num2deci(m.V_Ed*10**-3),
                            'UR_forskydning626' : num2percent(m.UR_forskydning626)})
                
                # ------------------------------------ Tryk --------------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Tryk - DS/EN 1993-1-1 6.3.1']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]
                UR_Tryk631 = m.UR_Tryk631

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftTryk'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                
                context.update({'critLoadCombTryk' : critLoadComb,
                            'soejletilfaelde' : m.soejletilfaelde,
                            'soejlekurve' : m.soejlekurve,
                            'alpha' : num2deci(m.alpha),
                            'Lambda' : num2deci(m.Lambda),
                            'N_cr' : num2deci(m.N_cr/1000),
                            'chi' : num2deci(m.chi),
                            'N_bRd' : num2deci(m.N_bRd/1000),
                            'N_Ed' : num2deci(m.N_Ed/1000),
                            'UR_Tryk631' : num2percent(m.UR_Tryk631)})
                
                # ------------------------------------ Kipning ----------------------------------------------#
                # critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_kipning632']
                # ECmembers = s.loadCombinations[critLoadComb]
                # m = ECmembers[i]
                # UR_kipning632 = m.UR_kipning632

                # image_paths['IMGsnitkraftKipning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                # if not os.path.exists(image_paths['IMGsnitkraftKipning']):
                #     plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)

                # context.update({'critLoadCombKipning' : critLoadComb,         
                #             'W_y' : num2deci(m.W_y*10**9),
                #             'kl' : num2deci(m.kl),
                #             'm4_u0' : num2deci(m.m4_u0),
                #             'M_cr' : num2deci(m.M_cr*10**-3),
                #             'lambda_LT' : num2deci(m.lambda_LT),
                #             'kipningskurve' : m.kipningskurve,
                #             'alpha_LT' : num2deci(m.alpha_LT),
                #             'lambda_LT0' : num2deci(m.lambda_LT0),
                #             'beta' : num2deci(m.beta),
                #             'XLT' : num2deci(m.XLT),
                #             'M_bRd' : num2deci(m.M_bRd*10**-3),
                #             'UR_kipning632' : num2percent(m.UR_kipning632)})
                
                # ------------------------------------ Kropsforstærkning --------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Lokale tværgående kræfter - DS/EN 1993-1-3 6.1.7']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]
                UR_lokaleTvaergaaendeKraefter617 = m.UR_lokaleTvaergaaendeKraefter617

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftKropsforstaerkning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                

                
                context.update({'critLoadCombKropsforstaerkning' : critLoadComb,         
                            'phi' : itanum(m.phi),
                            'h_w' : num2deci(m.h_w),
                            'Ss' : num2deci(m.Ss),
                            'k' : num2deci(m.k),
                            'k1' : num2deci(m.k1),
                            'k2' : num2deci(m.k2),
                            'k3' : num2deci(m.k3),
                            'k4' : num2deci(m.k4),
                            'k5' : num2deci(m.k5),
                            'R_wRd' : num2deci(m.R_wRd*10**-3),
                            'R' : num2deci(m.R*10**-3),
                            'UR_lokaleTvaergaaendeKraefter617' : num2percent(m.UR_lokaleTvaergaaendeKraefter617)})

                # ------------------------------------ Deformation ----------------------------------------------#            
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_SLS']['Deformation']
                ECmembers = s.loadCombinations['SLS'][critLoadComb]
                m = ECmembers[i]
                
                UR_deformation = m.UR_deformation
                
                context.update({'critLoadCombDef' : critLoadComb,     
                            'def_criteria' : itanum(m.def_criteria),
                            'maxAllowable' : num2deci(m.maxAllowable*1000),
                            'max_def' : num2deci(m.max_def*1000),
                            'UR_deformation' : num2percent(m.UR_deformation),
                            'ULS_max' : num2percent(max(UR_boejningsmoment625, UR_forskydning626, UR_Tryk631)), #UR_kipning632
                            'SLS_max' : num2percent(UR_deformation)})
                
# --------------------------------------------------- brand -------------------------------------------------------------------------------
                # ------------------------------------ Bøjning ----------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Bøjningsmoment - DS/EN 1993-1-1 6.2.5']
                ECmembers = s.loadCombinations['ALS'][critLoadComb]
                m = ECmembers[i]
                
                UR_boejningsmoment625_brand = m.UR_boejningsmoment625
                
                context.update({'critLoadCombBoejningB' : critLoadComb,                                                               
                            'M_cRdB' : num2deci(m.M_cRd*10**-3),
                            'M_EdB' : num2deci(m.M_Ed*10**-3),
                            'UR_boejning625B' : num2percent(m.UR_boejningsmoment625)})
                
                # ------------------------------------ Forskydning ----------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Forskydning - DS/EN 1993-1-1 6.2.6']
                ECmembers = s.loadCombinations['ALS'][critLoadComb]
                m = ECmembers[i]
                
                UR_forskydning626_brand = m.UR_forskydning626
                
                context.update({'critLoadCombForskydningB' : critLoadComb,
                            'V_cRdB' : num2deci(m.V_cRd*10**-3),
                            'V_EdB' : num2deci(m.V_Ed*10**-3),
                            'UR_forskydning626B' : num2percent(m.UR_forskydning626)})
                
                # ------------------------------------ Tryk --------------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Tryk - DS/EN 1993-1-1 6.3.1']
                ECmembers = s.loadCombinations['ALS'][critLoadComb]
                m = ECmembers[i]
                
                UR_Tryk631_brand = m.UR_Tryk631
                
                context.update({'critLoadCombTrykB' : critLoadComb,
                            'N_bRdB' : num2deci(m.N_bRd/1000),
                            'N_EdB' : num2deci(m.N_Ed/1000),
                            'UR_Tryk631B' : num2percent(m.UR_Tryk631)})
                
                # ------------------------------------ Kipning ----------------------------------------------#
                # critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['UR_kipning632_brand']
                # ECmembers = s.loadCombinations[critLoadComb]
                # m = ECmembers[i]
                
                # UR_kipning632_brand = m.UR_kipning632
                
                # context.update({'critLoadCombKipningB' : critLoadComb,         
                #             'M_bRdB' : num2deci(m.M_bRd*10**-3),
                #             'UR_kipning632B' : num2percent(m.UR_kipning632)})
                
                # ------------------------------------ Kropsforstærkning --------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Lokale tværgående kræfter - DS/EN 1993-1-3 6.1.7']
                ECmembers = s.loadCombinations['ALS'][critLoadComb]
                m = ECmembers[i]
                
                UR_lokaleTvaergaaendeKraefter617_brand = m.UR_lokaleTvaergaaendeKraefter617
                
                context.update({'critLoadCombKropsforstaerkningB' : critLoadComb,         
                            'R_wRdB' : num2deci(m.R_wRd*10**-3),
                            'RB' : num2deci(m.R*10**-3),
                            'UR_lokaleTvaergaaendeKraefter617B' : num2percent(m.UR_lokaleTvaergaaendeKraefter617)})
                
                # ------------------------------------ Ståltemp ----------------------------------------------#
                navne = {'Bøjning': UR_boejningsmoment625_brand, 'Forskydning': UR_forskydning626_brand, 'Tryk': UR_Tryk631_brand} #'Kipning': UR_kipning632_brand
                vv = list(navne.values())
                kk = list(navne.keys())
                maxnavn = kk[vv.index(max(vv))]
                ky = navne[maxnavn]
                temp = steeltempfire(ky)
                
                context.update({'dimtil' : maxnavn,         
                            'ky' : num2deci(ky),
                            'temp' : itanum(temp),
                            'ALS_max' : num2deci(ky)})
                        
            
            elif 'RH' in memberprop['profile']:
                reportType = 'column_steel_RHS'
                template_path = get_template_path(reportType)
                doc = DocxTemplate(template_path)
                
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Tryk - DS/EN 1993-1-1 6.3.1']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]
                
                context = { 'last' : last,
                            'critLoadCombTryk' : critLoadComb,
                            'Adresse' : project.address,
                            'Projektnummer' : project.projectNumber,
                            'navn_bjaelke' : str(m.beamname),
                            'L' : num2deci(m.L),
                            'profil' : str(memberprop['profile']).replace('.',','),
                            'tvaersnitsklasse' : str(m.tvaersnitsklasse).replace('.',','),
                            'konsekvensklasse' : str(s.konsekvensklasse).replace('.',','),
                            'KFi' : str(s.KFi).replace('.',','),
                            'b' : itanum(m.b*1000),
                            'h' : itanum(m.h*1000),
                            'd' : itanum(m.d*1000),
                            't' : itanum(m.t*1000),
                            'A' : itanum(m.A*10**6),
                            'r' : itanum(m.r*1000),
                            'I_y' : itanum(m.beam['I']*10**12),
                            'I_z' : itanum(m.I_z*10**12),
                            'I_v' : itanum(m.I_v*10**12),
                            'I_w' : itanum(m.I_w*10**18),
                            'W_el' : itanum(m.W_ely*10**9),
                            'W_pl' : itanum(m.W_pl*10**9),
                            'staalkval' : m.steelgrade,
                            'E' : itanum(m.E*10**-9),
                            'G' : itanum(m.G*10**-9),
                            'rho' : itanum(m.rho),
                            'gamma_M0' : num2deci(m.gamma_M0),
                            'gamma_M1' : num2deci(m.gamma_M1),
                            'nyttelast_linje' : 'OST',
                            'nyttelast_punkt' : 'OST',
                            'snelast_linje' : 'OST',
                            'snelast_punkt' : 'OST',
                            'vindlast_linje' : 'OST',
                            'vindlast_punkt' : 'OST',
                            'egenlast_linje' : 'OST',
                            'egenlast_punkt' : 'OST',
                            'ULS_nyttelast' : 'OST',
                            'SLS_nyttelast' : 'OST',
                            'ULS_snelast' : 'OST',
                            'SLS_snelast' : 'OST',
                            'ULS_vindlast' : 'OST',
                            'SLS_vindlast' : 'OST',
                            'f_y_flange' : itanum(m.f_y_flange*10**-6),
                            'f_y_krop' : itanum(m.f_y_krop*10**-6),
                            'soejletilfaelde' : m.soejletilfaelde,
                            'soejlekurve' : m.soejlekurve,
                            'alpha' : num2deci(m.alpha),
                            'Lambda' : num2deci(m.Lambda),
                            'N_cr' : num2deci(m.N_cr/1000),
                            'chi' : num2deci(m.chi),
                            'N_bRd' : num2deci(m.N_bRd/1000),
                            'N_Ed' : num2deci(m.N_Ed/1000),
                            'UR_Tryk631' : num2percent(m.UR_Tryk631)}
                
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Tryk - DS/EN 1993-1-1 6.3.1']
                ECmembers = s.loadCombinations['ALS'][critLoadComb]
                m = ECmembers[i]
                
                UR_Tryk631_brand = m.UR_Tryk631
                
                context.update({'critLoadCombTrykB' : critLoadComb,         
                            'N_bRdB' : num2deci(m.N_bRd/1000),
                            'N_EdB' : num2deci(m.N_Ed/1000),
                            'UR_Tryk631B' : num2percent(m.UR_Tryk631)})
                
                
                navne = {'Tryk': UR_Tryk631_brand}
                vv = list(navne.values())
                kk = list(navne.keys())
                maxnavn = kk[vv.index(max(vv))]
                ky = navne[maxnavn]
                temp = steeltempfire(ky)
                
                context.update({'dimtil' : maxnavn,         
                            'ky' : num2deci(ky),
                            'temp' : itanum(temp),
                            'ALS_max' : num2deci(ky)})
            
        
        elif membertype == 'Træ':
            if 'GL' in memberprop['strength class']:
                reportType = 'beam_wood'
                template_path = get_template_path(reportType)
                doc = DocxTemplate(template_path)
                
                print('Report not implemented for Glue Laminated')
            
                
            elif 'C' in memberprop['strength class'] or 'T' in memberprop['strength class']:

                reportType = 'beam_wood'
                template_path = get_template_path(reportType)
                doc = DocxTemplate(template_path)
                
                material = 'Konstruktionstræ'
                
                m = ECmembers[i]
                
                context = { 'last' : last,
                            'Adresse' : project.address,
                            'Projektnummer' : project.projectNumber,
                            'navn_bjaelke' : str(m.beamname).replace('.',','),
                            'material' : material,
                            'woodType2' : memberprop['strength class'],
                            'L' : num2deci(m.L),
                            'anvendelsesklasse' : m.anvendelsesklasse,
                            'konsekvensklasse' : str(s.konsekvensklasse).replace('.',','),
                            'KFi' : str(s.KFi).replace('.',','),
                            'b' : itanum(memberprop['b']*1000),
                            'h' : itanum(memberprop['h']*1000),
                            'A' : itanum(m.beam['A']*10**6),
                            'I' : itanum(m.beam['I']*10**12),
                            'f_mk' : num2deci(m.f_mk*10**-6),
                            'f_t0k' : num2deci(m.f_t0k*10**-6),
                            'f_t90k' : num2deci(m.f_t90k*10**-6),
                            'f_c0k' : num2deci(m.f_c0k*10**-6),
                            'f_c90k' : num2deci(m.f_c90k*10**-6),
                            'f_vk' : num2deci(m.f_vk*10**-6),
                            'E_mean' : num2deci(m.E_mean*10**-6),
                            'G_mean' : num2deci(m.G_mean*10**-6),
                            'rho' : itanum(m.rho),
                            'k_m' : num2deci(m.k_m),
                            'gamma_M' : num2deci(m.gamma_M),
                            'k_def' : num2deci(m.k_def),
                            }
                # ------------------------------------ Forskydning ----------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Forskydning - DS/EN 1995 6.1.7']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftForskydning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                context.update({'critLoadCombForskydning' : critLoadComb,         
                            'k_cr' : num2deci(m.k_cr),
                            'A_cr' : itanum(m.A_cr*10**6),
                            'V_Ed' : num2deci(m.V_Ed/1000),
                            'tau' : num2deci(m.tau*10**-6),
                            'f_vd' : num2deci(m.f_vd*10**-6),
                            'UR_forskydning617' : num2percent(m.UR_forskydning617)})

                # -------------------------------------- Bøjning ----------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Bøjning - DS/EN 1995 6.1.6']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftBojning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                context.update({'critLoadCombBoejning' : critLoadComb,         
                            'k_hm' : num2deci(m.k_hm),
                            'maxM' : num2deci(m.maxM*10**-3),
                            'sigma_myd' : num2deci(m.sigma_myd*10**-6),
                            'f_myd' : num2deci(m.f_myd*10**-6),
                            'UR_boejning616' : num2percent(m.UR_boejning616)})
                
                # ------------------------------------ Traek -------------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Træk parallelt med fibrene - DS/EN 1995 6.1.2']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftTraek'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                context.update({'critLoadCombTraek' : critLoadComb,         
                            'k_ht' : num2deci(m.k_ht),
                            'N_tEd' : num2deci(m.N_tEd*10**-3),
                            'sigma_t0d' : num2deci(m.sigma_t0d*10**-6),
                            'f_t0d' : num2deci(m.f_t0d*10**-6),
                            'UR_traekParalleltMedFibrene612' : num2percent(m.UR_traekParalleltMedFibrene612)})
                
                # ------------------------------------ Tryk --------------------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Tryk parallelt med fibrene - DS/EN 1995 6.1.4']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftTryk'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                context.update({'critLoadCombTraek' : critLoadComb,         
                            'N_cEd' : num2deci(m.N_cEd*10**-3),
                            'sigma_c0d' : num2deci(m.sigma_c0d*10**-6),
                            'f_c0d' : num2deci(m.f_c0d*10**-6),
                            'UR_trykParalleltMedFibrene614' : num2percent(m.UR_trykParalleltMedFibrene614)})
                
                # ------------------------------------ Træk og boejning --------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Kombineret bøjning og aksialt træk - DS/EN 1995 6.2.3']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftTraekOgBoejning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                context.update({'critLoadCombBoejningOgTraek' : critLoadComb,         
                            'UR_traekParalleltMedFibrene612' : num2percent(m.UR_traekParalleltMedFibrene612),
                            'UR_boejning616' : num2percent(m.UR_boejning616),
                            'UR_boejningOgTraek623' : num2percent(m.UR_boejningOgTraek623)})
                
                # ------------------------------------ Tryk og boejning --------------------------------------#
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Kombineret bøjning og aksialt tryk - DS/EN 1995 6.2.4']
                ECmembers = s.loadCombinations['ULS'][critLoadComb]
                m = ECmembers[i]

                filename, path = plots.plotSectionForcesMember(s, s.member_discr[i], 'ULS', critLoadComb, team_id, project_id, report_id)
                image_filenames.append(filename)
                context['IMGsnitkraftTrykOgBoejning'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
                
                context.update({'critLoadCombBoejningOgTryk' : critLoadComb,         
                            'UR_trykParalleltMedFibrene614' : num2percent(m.UR_trykParalleltMedFibrene614),
                            'UR_boejning616' : num2percent(m.UR_boejning616),
                            'UR_boejningOgTryk624' : num2percent(m.UR_boejningOgTryk624)})
                
        else:
            reportType = 'Murværkseftervisning'
            
            critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_ritter']
            ECmembers = s.loadCombinations[critLoadComb]
            m = ECmembers[i]
            UR_ritter = m.UR_ritter
            
            context.update({'last' : last,
                        'Adresse' : project.address,
                        'Projektnummer' : project.projectNumber,
                        'critLoadCombKropsforstaerkning' : critLoadComb,         
                        'fb' : num2deci(m.fb*10**-6),
                        'fm' : num2deci(m.fm*10**-6),
                        'fk' : num2deci(m.fk*10**-6),
                        'rho' : num2deci(m.rho),
                        'gamma_m' : num2deci(m.gamma_c),
                        't' : itanum(m.t*10**3),
                        'h' : itanum(m.h*10**3),
                        'L' : itanum(m.L*10**3),
                        'A_mur' : num2deci(m.A_mur),
                        'reduktion' : num2deci(m.reduktion),
                        'I' : itanum(m.I),
                        'l_plade' : itanum(m.l_plade*1000),
                        'e0' : itanum(m.e0),
                        'e5' : itanum(m.e5),
                        'efod' : itanum(m.efod),
                        'emaxRes' : itanum(m.emaxRes),
                        'hs' : itanum(m.hs*10**3),
                        'LV' : itanum(m.LV),
                        'tV' : itanum(m.tV),
                        'IV' : itanum(m.IV*10**12),
                        'LH' : itanum(m.LH),
                        'tH' : itanum(m.tH),
                        'IH' : itanum(m.IH*10**12),
                        'IT' : itanum(m.IT*10**12),
                        'inertimomentforhold' : num2deci(m.inertimomentforhold),
                        'pn' : num2deci(m.pn),
                        'ned' : num2deci(m.ned*10**-3),
                        'P1' : num2deci(m.N1*10**-3),
                        'P2' : num2deci(m.N2*10**-3),
                        'Ned' : num2deci(m.Ned*10**-3),
                        'Ntot' : num2deci(m.Ntot*10**-3),
                        'fd' : num2deci(m.fd*10**-6),
                        'ke' : itanum(m.ke),
                        'kt' : num2deci(m.kt),
                        'hef' : itanum(m.hef*10**3),
                        'lefm' : itanum(m.lefm*10**3),
                        'lam' : num2deci(m.lam),
                        'ks' : num2deci(m.ks),
                        'Rsd' : num2deci(m.Rsd*10**-3),
                        'UR_ritter' : num2percent(m.UR_ritter)})
        
            
            critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_konc']
            ECmembers = s.loadCombinations[critLoadComb]
            m = ECmembers[i]
            
            UR_konc = m.UR_konc
            
            context.update({'critLoadCombKropsforstaerkning' : critLoadComb,         
                        'b_plade' : itanum(m.b_plade*1000),
                        'A_plade' : itanum(m.A_plade*10**6),
                        'hv' : itanum(m.hv*1000),
                        'fd' : num2deci(m.fd*10**-6),
                        'beta' : num2deci(m.beta),
                        'NRdc' : num2deci(m.NRdc*10**-3),
                        'UR_konc' : num2percent(m.UR_konc)})    
      
        
        #--------------------- Add general member images --------------------------------------------------------
        max_width = 165  # Maximum width in mm based on page margins
        desired_height = 80  # Desired height in mm

        filename, path = plots.plotSectionForcesMemberEnvelope(s, s.member_discr[i], 'ULS', team_id, project_id, report_id)
        image_filenames.append(filename)
        context['IMGsectionForceEnvelope'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))

        filename, path = plots.staticPlot(s.model, ECmembers, i, team_id, project_id, report_id)
        image_filenames.append(filename)
        context['IMGstatisksystem'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
        

        color = [4/255,10/255,161/255]
        mat = s.sectionResults[i]['UR_loadcomb_mat_ULS']
        URnames = s.sectionResults[i]['URnames_ULS']
        URcombnames = s.sectionResults[0]['LoadCombnames_ULS']

        filename, path = plots.URmat(mat, URnames, URcombnames, color, i, team_id, project_id, report_id)
        image_filenames.append(filename)
        context['IMGmatrixUR'] = InlineImage(doc, download_plot_descriptor(filename), width=Mm(120))
        


        # for key, image_path in image_paths.items():
        #     image = Image.open(image_path)
        #     width_px, height_px = image.size
        #     dpi = image.info.get('dpi', (96, 96))  # Default DPI

        #     # Convert image size to mm
        #     width_mm = width_px / dpi[0] * 25.4
        #     height_mm = height_px / dpi[1] * 25.4

        #     # Calculate width at desired height
        #     width_at_desired_height = width_mm * (desired_height / height_mm)

        #     if width_at_desired_height <= max_width:
        #         # Width is within limits, use desired height
        #         context[key] = InlineImage(doc, image_descriptor=image_path, height=Mm(desired_height))
        #     else:
        #         # Adjust height to fit max width
        #         scaling_factor = max_width / width_mm
        #         adjusted_height = height_mm * scaling_factor
        #         context[key] = InlineImage(doc, image_descriptor=image_path, height=Mm(adjusted_height))
        
        if reportType == 'Murværkseftervisning':
        
            m.plotExcentricitetRitter()
            plt.savefig("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/plotExcentricity" + str(i+1) + '.png', bbox_inches='tight')

            m.plotKoncentreretLast()
            plt.savefig("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/plotSpaendingsfordeling" + str(i+1) + '.png', bbox_inches='tight')
            
            m.plotStabiliserendeVaeg()
            plt.savefig("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/plotStabiliserende" + str(i+1) + '.png', bbox_inches='tight')
            
            context['IMGplotExcentricity'] = InlineImage(doc, image_descriptor=ImagePath + "plotExcentricity" + str(i+1) + ".png", height=Mm(100))
            context['IMGplotSpaendingsfordeling'] = InlineImage(doc, image_descriptor=ImagePath + "plotSpaendingsfordeling" + str(i+1) + ".png", height=Mm(100))
            context['IMGplotStabiliserende'] = InlineImage(doc, image_descriptor=ImagePath + "plotStabiliserende" + str(i+1) + ".png", height=Mm(100))
            

        doc.render(context)
        filename_report = make_report_filename(team_id, project_id, report_id)

        # Save individual doc (S3 or local) and also capture bytes for ZIP
        # Use the beam name as the suggested download filename
        display_title_member = member_beamname
        storage_ref, presigned_url = save_document(doc, filename_report, display_title=display_title_member)

        # Capture bytes for zip archive
        try:
            _buf = io.BytesIO()
            doc.save(_buf)
            _buf.seek(0)
            zip_entries.append((f"{member_beamname}.docx", _buf.getvalue()))
        finally:
            try:
                _buf.close()
            except Exception:
                pass

        reports.append({
            'member_index': i,
            'report_id': report_id,
            's3_key': filename_report,
            'storage_ref': storage_ref,
            'download_url': presigned_url,
        })

        # Evict all cached plot images for this member now that the doc has been rendered and saved
        for _fn in image_filenames:
            try:
                plots.evict_plot_cache(_fn)
            except Exception:
                pass

    # After generating individual reports, also create a single ZIP for convenient download
    if not reports:
        raise ValueError('No members found to generate reports')

    # Build ZIP in-memory
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in zip_entries:
            # Ensure unique names in case of collisions
            base, ext = os.path.splitext(name)
            candidate = name
            cnt = 1
            while candidate in zf.namelist():
                candidate = f"{base}-{cnt}{ext}"
                cnt += 1
            zf.writestr(candidate, data)
    zip_buf.seek(0)

    # Derive a friendly base title
    base_title = (title or 'reports').strip()
    base_title = re.sub(r'\s+', '-', base_title)
    # Match the same allowed set as _sanitize_filename_base, including æøåÆØÅ
    base_title = re.sub(r'[^A-Za-z0-9._ÆØÅæøå-]+', '', base_title) or 'reports'

    # Save ZIP to S3 or locally, mirroring save_document behavior
    bundle_report_id = str(uuid.uuid4())
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name
    zip_storage_ref: str
    zip_presigned_url: Optional[str] = None
    zip_s3_key: Optional[str] = None
    if dev_local:
        base_dir = '/tmp' if os.getenv('AWS_LAMBDA_FUNCTION_NAME') else os.path.join(os.getcwd(), 'output')
        os.makedirs(base_dir, exist_ok=True)
        zip_local_name = f"{base_title}-{bundle_report_id[:8]}.zip"
        zip_local_path = os.path.join(base_dir, zip_local_name)
        with open(zip_local_path, 'wb') as f:
            f.write(zip_buf.getvalue())
        zip_storage_ref = zip_local_path
    else:
        s3_client = boto3.client('s3')
        zip_key = f"{team_id}/{project_id}/{bundle_report_id}.zip"
        extra_args = {'ContentType': 'application/zip'}
        if os.getenv('REPORT_OBJECT_ACL'):
            extra_args['ACL'] = os.getenv('REPORT_OBJECT_ACL')
        s3_client.put_object(Bucket=bucket_name, Key=zip_key, Body=zip_buf.getvalue(), **extra_args)
        # Best effort HEAD
        try:
            s3_client.head_object(Bucket=bucket_name, Key=zip_key)
        except Exception as head_err:
            print(f"[report][warn] HEAD after ZIP upload failed: {head_err}")
        # Presign
        response_disposition = f'attachment; filename="{base_title}.zip"'
        zip_presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': zip_key,
                'ResponseContentDisposition': response_disposition,
                'ResponseContentType': 'application/zip'
            },
            ExpiresIn=int(os.getenv('INLINE_PRESIGN_TTL_SECONDS', '900'))
        )
        zip_storage_ref = f"s3://{bucket_name}/{zip_key}"
        zip_s3_key = zip_key

    # Primary download points to ZIP, while returning the individual reports as well
    return {
        'reports': reports,
        'zip': {
            'report_id': bundle_report_id,
            's3_key': zip_s3_key,
            'storage_ref': zip_storage_ref,
            'download_url': zip_presigned_url,
        },
        # Back-compat convenience: make top-level fields point to the ZIP bundle
        'report_id': bundle_report_id,
        's3_key': zip_s3_key,
        'storage_ref': zip_storage_ref,
        'download_url': zip_presigned_url,
    }

    
def save_document(
    doc: DocxTemplate, 
    filename: str,
    display_title: str | None = None,
) -> tuple[str, str | None]:
    """
    Saves a docx document either locally or to S3 based on API_ENV
    
    Args:
        doc: DocxTemplate to save
        filename: Name of file to save
    
    Returns:
    tuple[path_or_uri, presigned_url_or_none]
    """
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name  # treat absence as pure local mode (no S3 key semantics)
    
    # Save to S3
    try:
        if dev_local:
            base_dir = '/tmp' if os.getenv('AWS_LAMBDA_FUNCTION_NAME') else os.path.join(os.getcwd(), 'output')
            os.makedirs(base_dir, exist_ok=True)
            local_path = os.path.join(base_dir, os.path.basename(filename))
            doc.save(local_path)
            return local_path, None
        else:
            buf = io.BytesIO()
            doc.save(buf)
            buf.seek(0)
            s3_client = boto3.client('s3')
            extra_args = {}
            # Allow enabling bucket-owner-full-control ACL if cross-account ownership issues suspected
            if os.getenv('REPORT_OBJECT_ACL'):
                extra_args['ACL'] = os.getenv('REPORT_OBJECT_ACL')
            s3_client.upload_fileobj(buf, bucket_name, filename, ExtraArgs=extra_args if extra_args else None)

            # Immediate HEAD to surface AccessDenied early (helps debugging presign failures)
            try:
                s3_client.head_object(Bucket=bucket_name, Key=filename)
            except Exception as head_err:
                print(f"[report][warn] HEAD after upload failed: {head_err}")
                # Continue; presign may still work if eventual consistency (rare) but log it
            presigned = None
            if os.getenv('DISABLE_INLINE_PRESIGN', 'false').lower() not in ('1','true','yes'):  # only generate if not disabled
                # Sanitize display filename
                import re
                base = (display_title or 'report').strip()
                base = re.sub(r'\s+', '-', base)
                # Allow æøåÆØÅ plus safe ASCII filename characters
                base = re.sub(r'[^A-Za-z0-9._ÆØÅæøå-]+', '', base)
                if not base:
                    base = 'report'
                response_disposition = f'attachment; filename="{base}.docx"'
                presigned = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': bucket_name,
                        'Key': filename,
                        'ResponseContentDisposition': response_disposition,
                        'ResponseContentType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    },
                    ExpiresIn=int(os.getenv('INLINE_PRESIGN_TTL_SECONDS', '900'))
                )
            return f"s3://{bucket_name}/{filename}", presigned
    except Exception as e:
        print(f"Error saving report document: {e}")
        raise
    finally:
        if 'buf' in locals():
            buf.close()
