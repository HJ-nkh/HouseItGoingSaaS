#Program to analys of 2D frames
import numpy as np
import math
from Moon2Mars.Steel_beams import SteelBeams
from Moon2Mars.Steel_parameters import SteelProp
from Moon2Mars.Wood_parameters import WoodProp
from Moon2Mars.MurProp import MurProp

# from matplotlib import pyplot as plt #only for development
from scipy.interpolate import CubicSpline

class Model:
    def __init__(self):
        
        self.steelbeams = SteelBeams()
        self.steelprop = SteelProp()
        self.woodprop = WoodProp()
        self.murprop = MurProp()
        
        self.ndofn = 3
        
        self.X = np.empty((0,2), float)
        self.T = np.empty((0,2), int)
        self.hinge = np.empty((0,2), bool)
        self.U = np.empty((0), int)
        self.bL = np.empty((0,2), float)
        self.localLoads = np.empty((0,6), float)
        
        
        self.E = np.empty((0), float)
        self.A = np.empty((0), float)
        self.I = np.empty((0), float)
        self.rho = np.empty((0), float)
        
        self.hingeElementAndNode=np.empty((0,2), int)
        self.member = []
            
        
    def addMembers(self, entity_set):
        e=0
        for id, mem in entity_set.get('members').items():
            e+=1

            node1 = mem.get('node1').get('id')
            node2 = mem.get('node2').get('id')

            x1 = entity_set.get('nodes').get(node1).get('resolved').get('x')
            y1 = entity_set.get('nodes').get(node1).get('resolved').get('y')
            x2 = entity_set.get('nodes').get(node2).get('resolved').get('x')
            y2 = entity_set.get('nodes').get(node2).get('resolved').get('y')

            discr = 4 #discretization of beam in elements between needed nodes
            self.discr = discr

            # memberProp = {'b': 0.045, 'h':0.295, 'l':4.2, 't':0.136, 'efod':0, 'e5':0.010, 'et':0.017, 't_plade':0.010, 'b_plade':0.100, 'l_plade':0.200,
            #        'l1':0, 't1':0, 'l2':0, 't2':0, 'Ned':21000, 'ned':0, 'afstand_kraft':0, 'vind':0, 'murtype':'Porebeton', 'profile': 'HE140B', 'strength class': 'C24'}

            memberPropFrontend = mem.get('memberprop')
            memberProp = {}

            if memberPropFrontend['name'] == None or memberPropFrontend['name'] == '':
                memberName = "konstruktionsdel " + str(e)
            else:
                memberName = memberPropFrontend['name']

            if memberPropFrontend['type'] == 'Steel':
                memberProp['type'] = 'Stål'
                memberProp['profile'] = memberPropFrontend['steelProfile']
                memberProp['strength class'] = memberPropFrontend['steelStrength']
                memberProp['deflection requirement'] = memberPropFrontend['deflectionRequirement'] if memberPropFrontend['deflectionRequirement'] != None else None
                memberProp['deflectionIsLocal'] = memberPropFrontend['deflectionIsLocal'] if memberPropFrontend['deflectionIsLocal'] != None else True
                memberProp['selfWeightEnabled'] = memberPropFrontend['selfWeightEnabled'] if memberPropFrontend['selfWeightEnabled'] != None else True
            elif memberPropFrontend['type'] == 'Wood':
                memberProp['type'] = 'Træ'
                memberProp['strength class'] = memberPropFrontend['woodType']
                memberProp['b'] = memberPropFrontend['woodSize']['width']*10**-3
                memberProp['h'] = memberPropFrontend['woodSize']['height']*10**-3
                memberProp['deflectionIsLocal'] = memberPropFrontend['deflectionIsLocal']
                memberProp['deflectionRequirementFinished'] = memberPropFrontend['deflectionRequirementFinished'] if memberPropFrontend['deflectionRequirementFinished'] != None else None
                memberProp['deflectionRequirementInstantSnow'] = memberPropFrontend['deflectionRequirementInstantSnow'] if memberPropFrontend['deflectionRequirementInstantSnow'] != None else None
                memberProp['deflectionRequirementInstantWind'] = memberPropFrontend['deflectionRequirementInstantWind'] if memberPropFrontend['deflectionRequirementInstantWind'] != None else None
                memberProp['deflectionRequirementInstantLive'] = memberPropFrontend['deflectionRequirementInstantLive'] if memberPropFrontend['deflectionRequirementInstantLive'] != None else None
                memberProp['selfWeightEnabled'] = memberPropFrontend['selfWeightEnabled'] if memberPropFrontend['selfWeightEnabled'] != None else True
            elif memberPropFrontend['type'] == 'Masonry':
                memberProp['type'] = 'Murværk'
                memberProp['murtype'] = memberPropFrontend['murtype']

            memberType = memberProp['type']
                
            if memberType == 'Stål':
                E = self.steelprop.getElasticity()
                rho = self.steelprop.getDensity()
                A = self.steelbeams.getArea(memberProp['profile'])
                I = self.steelbeams.getI_y(memberProp['profile'])
            elif memberType == 'Træ':
                E = self.woodprop.getElasticity(memberProp['strength class'])
                rho = self.woodprop.getDensity(memberProp['strength class'])
                A = memberProp['b']*memberProp['h']
                I = 1/12*memberProp['b']*memberProp['h']**3
            elif memberType == 'Murværk':
                E = self.steelprop.getElasticity()
                rho = self.murprop.getStandard_murvaerk_parametre(memberProp['murtype'], 'Density')
                A = memberProp['t']*memberProp['l']
                I = self.steelbeams.getI_y('HE280B')
            
            consistOfelements = np.empty((0), int)

            newNodes = np.empty((0,2))
            newNodes = np.append(newNodes,[[x1, y1]],axis=0)
            newNodes = np.append(newNodes,[[x2, y2]],axis=0)
            for dp in mem.get('dependants'):
                if 'dl' in dp:
                    x1d = entity_set.get('distributedLoads').get(dp).get('resolved').get('point1').get('x')
                    y1d = entity_set.get('distributedLoads').get(dp).get('resolved').get('point1').get('y')
                    x2d = entity_set.get('distributedLoads').get(dp).get('resolved').get('point2').get('x')
                    y2d = entity_set.get('distributedLoads').get(dp).get('resolved').get('point2').get('y')
                    newNodes = np.append(newNodes,[[x1d,y1d]],axis=0)
                    newNodes = np.append(newNodes,[[x2d,y2d]],axis=0)
                elif 'pl' in dp:
                    x = entity_set.get('pointLoads').get(dp).get('resolved').get('x')
                    y = entity_set.get('pointLoads').get(dp).get('resolved').get('y')
                    newNodes = np.append(newNodes,[[x,y]],axis=0)
                elif 's' in dp:
                    x = entity_set.get('supports').get(dp).get('resolved').get('x')
                    y = entity_set.get('supports').get(dp).get('resolved').get('y')
                    newNodes = np.append(newNodes,[[x,y]],axis=0)
                elif 'ml' in dp:
                    x = entity_set.get('momentLoads').get(dp).get('resolved').get('x')
                    y = entity_set.get('momentLoads').get(dp).get('resolved').get('y')
                    newNodes = np.append(newNodes,[[x,y]],axis=0)
                elif 'n' in dp:
                    x = entity_set.get('nodes').get(dp).get('resolved').get('x')
                    y = entity_set.get('nodes').get(dp).get('resolved').get('y')
                    newNodes = np.append(newNodes,[[x,y]],axis=0)
            
            rounded_nodes = np.round(newNodes, 6)

            # Find the indices of unique rows based on the rounded values
            _, unique_indices = np.unique(rounded_nodes, axis=0, return_index=True)

            # Filter the original array to keep only unique rows, preserving full decimals
            newNodes = newNodes[unique_indices]

            if x1 == x2:
                newNodes = newNodes[np.argsort(newNodes[:, 1])] #sort by y
            else:
                newNodes = newNodes[np.argsort(newNodes[:, 0])] #sort by x
             
            end1, end2 = newNodes[0,:], newNodes[-1,:]

            L_beam = np.sqrt((end2[0]-end1[0])**2 + (end2[1]-end1[1])**2)

            x_beamDiscr = np.empty((0))
            y_beamDiscr = np.empty((0))
            for ii in range(np.size(newNodes,0)-1):
                #L_beam = np.sqrt((newNodes[ii+1,0]-newNodes[ii,0])**2 + (newNodes[ii+1,1]-newNodes[ii,1])**2)
                if np.size(newNodes,0)-2 == ii:
                    x_beamDiscr = np.append(x_beamDiscr, np.linspace(newNodes[ii,0],newNodes[ii+1,0],int(discr)+1))
                    y_beamDiscr = np.append(y_beamDiscr, np.linspace(newNodes[ii,1],newNodes[ii+1,1],int(discr)+1))
                else:
                    x_beamDiscr = np.append(x_beamDiscr, np.linspace(newNodes[ii,0],newNodes[ii+1,0],int(discr)+1)[:-1])
                    y_beamDiscr = np.append(y_beamDiscr, np.linspace(newNodes[ii,1],newNodes[ii+1,1],int(discr)+1)[:-1])
               
            dim = 2 #For 2D

            anyExistingNodesEnd1 = np.any(np.sum(np.round(self.X,6)==np.round(end1,6),1)==dim)
            if anyExistingNodesEnd1: existingNodeLoc1 = np.argwhere(np.sum(np.round(self.X,6)==np.round(end1,6),1)==dim)[0][0]

            anyExistingNodesEnd2 = np.any(np.sum(np.round(self.X,6)==np.round(end2,6),1)==dim)
            if anyExistingNodesEnd2: existingNodeLoc2 = np.argwhere(np.sum(np.round(self.X,6)==np.round(end2,6),1)==dim)[0][0]

            if not anyExistingNodesEnd1:
                self.X = np.append(self.X,[end1],0)
            for i in range(len(x_beamDiscr)-1):
                
                if 0==i and anyExistingNodesEnd1:
                    i_end1 = existingNodeLoc1
                    h_end1 = self.findHinge(entity_set, existingNodeLoc1, node1, node2)
                else:
                    i_end1 = np.size(self.X,0)-1
                    h_end1 = False

                end2[0], end2[1] = x_beamDiscr[i+1], y_beamDiscr[i+1]    

                if len(x_beamDiscr)-2==i and anyExistingNodesEnd2:
                    i_end2 = existingNodeLoc2
                    h_end2 = self.findHinge(entity_set, existingNodeLoc2, node1, node2)
                else:
                    self.X = np.append(self.X,[end2],0)
                    i_end2 = np.size(self.X,0)-1
                    h_end2 = False

                # #Element topology: T[element,:] = [Start node, end node]
                self.T = np.append(self.T,[[i_end1,i_end2]],0)
                self.hinge = np.append(self.hinge,[[h_end1,h_end2]],0)
                self.localLoads = np.append(self.localLoads,np.zeros((1,6), float),axis=0)

                # Material data
                self.E = np.append(self.E,[E],0)
                self.A = np.append(self.A,[A],0)
                self.I = np.append(self.I,[I],0)
                self.rho = np.append(self.rho,[rho],0)
                
                consistOfelements = np.append(consistOfelements,[len(self.T)-1],0)

                end1 = end2
            
            
            beamProp = {'id':id, 'membername':memberName, 'membertype':memberType, 'memberprop':memberProp, 'L':L_beam, 'E':E, 'A':A, 'I':I, 'rho':rho, 'consistOfelements': consistOfelements}

            self.member.append(beamProp)

        self.createD()


    def findHinge(self, entity_set, existingNodeLoc, node1, node2):
        for node in [node1, node2]:
            if np.round(entity_set.get('nodes').get(node).get('resolved').get('x'),6) == np.round(self.X[existingNodeLoc,0],6) and np.round(entity_set.get('nodes').get(node).get('resolved').get('y'),6) == np.round(self.X[existingNodeLoc,1],6):
                if entity_set.get('nodes').get(node).get('assembly') == 'Hinge':
                    return True
                else:
                    return False
                

    def createD(self):
        T = self.T
        X = self.X
        hinge = self.hinge
        ndofn = self.ndofn
        nno = np.size(X,0)
        nel = np.size(T,0)
        D = np.zeros((nel,ndofn*2))

        #Freedom degrees global dof: dn[nno,:] = [V0, V1, V2]
        dn = np.zeros((nno,3))
        dn[0,:] = [0, 1, 2]
        for i in range(1,nno):
            dn[i,:] = dn[i-1,:] + ndofn

        maxdof = int(np.max(dn))    
            
        # Freedom degress, globaf dof: D[el,:] = [V0 V1 V2 V3 V4 V5]
        for el in range(0,nel):
            for i in range(0,3):
                D[el,i] = dn[int(T[el,0]),i]
            if hinge[el,0]:
                maxdof = maxdof + 1
                D[el,2] = maxdof
            for j in range(3,6):
                D[el,j] = dn[int(T[el,1]),j-3]
            if hinge[el,1]:
                maxdof = maxdof + 1
                D[el,5] = maxdof
       
        self.D = D
            
        
    def addSupport(self,location,localDof):       #, coor):
                     
        dim = 2 #For 2D
        
        if np.any(np.sum(np.round(self.X,6)==np.round(location,6),1)==dim):
            i_loc = np.argwhere(np.sum(np.round(self.X,6)==np.round(location,6),1)==dim)[0][0]
            
            if localDof == "x":
                dof = i_loc*self.ndofn
            elif localDof == "y":
                dof = i_loc*self.ndofn+1
            elif localDof == "r":
                dof = i_loc*self.ndofn+2
            else:
                print("addSupport - localDof not defined correctly")
                     
            self.U = np.append(self.U,[dof])
            self.nsup = np.size(self.U,0)
            
        else:
            print("addSupport - No node exist at given coordinate!")
        
        
    def addLoad(self,location,localDof,P0):    # coor, direction):        
        
        dim = 2
        
        if np.any(np.sum(np.round(self.X,6)==np.round(location,6),1)==dim):
            i_loc = int(np.argwhere(np.sum(np.round(self.X,6)==np.round(location,6),1)==dim)[0][0])
                      
            if 'i_loc' not in locals():
                print('A load is not applied correctly onto beam')
                return
                          
            if localDof == "Fx":
                dof = i_loc*self.ndofn
            elif localDof == "Fy":
                dof = i_loc*self.ndofn+1
            elif localDof == "M":
                dof = i_loc*self.ndofn+2
            else:
                print("addLoad - localDof not defined correctly")
            
            self.bL = np.append(self.bL,[[dof, P0]],0)

    def addLineLoad(self,location1,location2,localDof,p1,p2):    # coor, direction):

        dim = 2

        i_loc1 = int(np.argwhere(np.sum(np.round(self.X,6)==np.round(location1,6),1)==dim)[0][0])
        i_loc2 = int(np.argwhere(np.sum(np.round(self.X,6)==np.round(location2,6),1)==dim)[0][0])
                         
        end1, end2 = self.X[i_loc1], self.X[i_loc2]
        
        i_loc_ini = int(i_loc1)
        
        r1, r2 = end2[0]-end1[0], end2[1]-end1[1]
        x0, y0 = end1[0], end1[1]
    
        nodenum = np.empty((0,2), float)
        nodenum = np.append(nodenum,[[0, i_loc_ini]],0)
        for i in range(np.size(self.X,0)):
            if i == i_loc_ini:
                continue
 
            x = self.X[i,0]
            y = self.X[i,1]
            
            if end1[0] == end2[0]:
                # vertical beam
                t2 = np.round((y-y0)/r2,6)        
                if t2 >= 0 and t2 <= 1 and x == self.X[i_loc_ini,0]:
                    nodenum = np.append(nodenum,[[t2, i]],0)
            elif end1[1] == end2[1]:
                # horizontal beam
                t1 = np.round((x-x0)/r1,6)
                if t1 >= 0 and t1 <= 1 and y == self.X[i_loc_ini,1]:
                    nodenum = np.append(nodenum,[[t1, i]],0)
            else:     
                t1 = np.round((x-x0)/r1,6)
                t2 = np.round((y-y0)/r2,6)
                if t1 == t2 and t1 >= 0 and t1 <= 1:
                    nodenum = np.append(nodenum,[[t1, i]],0)
        
        nodenum = nodenum[nodenum[:,0].argsort()]

        for i in range(np.size(nodenum,0)-1):

            try:
                el = np.argwhere(np.sum(self.T==[int(nodenum[i,1]), int(nodenum[i+1,1])],1)==2)[0][0]
            except:
                el = np.argwhere(np.sum(self.T==[int(nodenum[i+1,1]), int(nodenum[i,1])],1)==2)[0][0]

            X1, X2 = self.X[int(nodenum[i,1])], self.X[int(nodenum[i+1,1])]
            
            A, L = self.Abeam(X1,X2)
            
            p1partly = p1 + (p2-p1)*nodenum[i,0]
            p2partly = p1 + (p2-p1)*nodenum[i+1,0]
            
            if localDof == "Fx":
                r = np.array([p1partly, 0, 0, p2partly, 0, 0])
            elif localDof == "Fy":
                r = np.array([0, p1partly, 0, 0, p2partly, 0])
            elif localDof == "M":
                print("addSupport - cannot add moment for lineload")
            else:
                print("addSupport - localDof not defined correctly")
                
            r_local = np.matmul(A,r)
            
            p1_hor, p2_hor, p1_ver, p2_ver = r_local[0], r_local[3], r_local[1], r_local[4] 
                
            r_localNodes = np.array([[((2*p1_hor+p2_hor)*L)/6], [((7*p1_ver+3*p2_ver)*L)/20], [((3*p1_ver+2*p2_ver)*L**2)/60], [((2*p2_hor+p1_hor)*L)/6], [((3*p1_ver+7*p2_ver)*L)/20], [(-(2*p1_ver+3*p2_ver)*L**2)/60]])
                
            r_globalNodes = np.matmul(np.transpose(A),r_localNodes)
            
            self.localLoads[el,:] = self.localLoads[el,:] + np.transpose(r_localNodes)
            
            dof = self.D[el,:]
            
            for ii in range(6):                
                self.bL = np.append(self.bL,[[int(dof[ii]), r_globalNodes[ii][0]]],0)

        
    def addSelfWeight(self,factor):
        
        g = -9.82 # tyngdeacceleration

        for i in range(len(self.member)):
            if not self.member[i]['memberprop']['selfWeightEnabled']:
                continue
        
            for j in self.member[i]['consistOfelements']:
                
                x1, y1 = self.X[self.T[j,0],0], self.X[self.T[j,0],1]
                
                x2, y2 = self.X[self.T[j,1],0], self.X[self.T[j,1],1]
                
                N_pr_m = self.member[i]['rho']*self.member[i]['A']*g*factor #[kg/m]*a
                
                self.addLineLoad([x1, y1], [x2, y2], "Fy", N_pr_m, N_pr_m)
                  
        
    def run(self):
        
        E = self.E
        A = self.A
        I = self.I
        
        X = self.X
        T = self.T
        
        U = self.U
        D = self.D
        nd = np.max(D)+1
              
        self.nl = np.size(self.bL,0)
        bL = self.bL
        
        nl = self.nl
        
        ndofn = self.ndofn

        nel = np.size(T,0)
        
        nsup = self.nsup
        
        G = np.zeros((nel,3))
              
        #Materials: G[el,:] = [E,A,I]
        for i in range(0,nel):
            G[i,:] = [E[i], A[i], I[i]]
      
    
        
        K = np.zeros((int(nd),int(nd)))
        for el in range(0,nel):
            no1 = int(T[el,0])
            no2 = int(T[el,1])
            X1 = X[no1,:]
            X2 = X[no2,:]
            k = self.kbeam(X1,X2,G,el)
            de = D[el,:]
            for i in range(0,2*ndofn):
                for j in range(0,2*ndofn):
                    K[int(de[i]),int(de[j])] = K[int(de[i]),int(de[j])] + k[i,j]
              
        R = np.zeros(int(nd))

        nbL = nl
        for i in range(0,nbL):
            d = bL[i,0]
            R[int(d)] = R[int(d)] + bL[i,1]            
        
        # Support conditions
        #diagK = np.diag(K)
        #kmax = np.max(diagK)*10**8
        
        K_support = np.zeros((nsup,int(nd)))
        R_support = np.zeros((nsup))
        for i in range(0,nsup):
            
            K_support[i] = K[int(U[i]),:]
            R_support[i] = R[int(U[i])]
            
            K[int(U[i]),:] = 0
            K[:,int(U[i])] = 0
            K[int(U[i]),int(U[i])] = 1
            R[U[i]] = 0
        
        #Calculate deformations
        Kinv = np.linalg.inv(K)
        V = np.dot(Kinv,R)
        
        R0 = np.matmul(K_support,V) - R_support
        for i in range(0,nsup):
            R[int(U[i])] = R[int(U[i])] + R_support[i]

        self.F1 = np.zeros((nel,2))
        self.F2 = np.zeros((nel,2))
        self.M = np.zeros((nel,2))

        Ve = np.zeros([nel,len(de)])
        for el in range(0,nel):
            no1 = int(T[el,0])
            no2 = int(T[el,1])
            X1 = X[no1,:]
            X2 = X[no2,:]
            de = D[el,:]
            for i in range(0,len(de)):
                Ve[el,i] = V[int(de[i])]
            Re = self.S(X1,X2,G,Ve[el,:],el)
            self.F1[el,:] = Re[0]
            self.F2[el,:] = Re[1]
            self.M[el,:] = Re[2]
        
        self.nel = nel
        self.D = D
        self.V = V
        self.R0 = R0
        self.Ve = Ve
            
        #self.TOPplots(X,T,nel,nno)
        #self.DEFplot(X,T,D,V,nel,Vscale)
        #Splot(X,T,nel,F1,1,dL,Sscale)
        #Splot(X,T,nel,F2,2,dL,Sscale)
        #self.Splot(X,T,nel,M,3,dL,Sscale)
        


    ## ---------------------------Functions -----------------------------------
    
    #Transformation matrix 
    def Abeam(self,X1,X2):
        a0 = X2 - X1
        L = math.sqrt(np.matmul(a0,a0))
        n = a0/L
        A = [[n[0], n[1], 0, 0, 0, 0],
             [-n[1], n[0], 0, 0, 0, 0],
             [0, 0, 1, 0, 0, 0],
             [0, 0, 0, n[0], n[1], 0],
             [0, 0, 0, -n[1], n[0],0],
             [0, 0, 0, 0, 0, 1]]
        return A, L
    
    # Create stiffness matrix
    def kbeam(self,X1,X2,G,el):
        Ae = self.Abeam(X1,X2)
        A = Ae[0]
        Atrans = np.transpose(A)
        L = Ae[1]
        #create stiffness matrix after local orientation
        EA = G[el,0]*G[el,1]
        EI = G[el,0]*G[el,2]
        
        k = [[EA/L,           0,          0, -EA/L,           0,          0],
            [    0,  12*EI/L**3,  6*EI/L**2,     0, -12*EI/L**3,  6*EI/L**2],
            [    0,   6*EI/L**2,     4*EI/L,     0,  -6*EI/L**2,     2*EI/L],
            [-EA/L,           0,          0,  EA/L,           0,          0],
            [    0, -12*EI/L**3, -6*EI/L**2,     0,  12*EI/L**3, -6*EI/L**2],
            [    0,   6*EI/L**2,     2*EI/L,     0,  -6*EI/L**2,     4*EI/L]]
        
        k1 = np.matmul(Atrans,k)
        k = np.matmul(k1,A)
        return k
    
    # Load vector R
    def rbeam(self,X1,X2,dLe):
        #Build load vector
        #Use transformationmatrix
        Ae = self.Abeam(X1,X2)
        A = Ae[0]
        L = Ae[1]
        #Collect r in accordance with local orientation
        r = np.zeros(6)
        if dLe[0] == 1:
            p = dLe[1]*L/2
            r = [p, 0, 0, p, 0, 0]
        elif dLe[0] == 2:
           p = dLe[1]*L/2
           m = dLe[1]*L**2/12
           r = [0, p, m, 0, p, -m]
        else:
            print('Mistake in load vector')
        r = np.transpose(A)*r
    
    #Calculate sectional forces
    def S(self,X1,X2,G,Ve,el):
        #F1: Normal force
        #F2: Shear force
        #M: Moment
        Ae = self.Abeam(X1,X2)
        A = Ae[0]
        L = Ae[1]
        k = self.kbeam(X1,X2,G,el)
        #Calculate local node loads
        re1 = np.matmul(A,k)
        re = np.matmul(re1,Ve)

        re = re-self.localLoads[el,:]
        f1 = [-re[0], re[3]]
        f2 = [re[1], -re[4]]
        m = [-re[2], re[5]]
        return f1, f2, m
    
#---------------------------Displacement and Section force functions -----------------------------------
    def getDeformation(self, beam):
        X = self.X
        T = self.T
        D = self.D
        V = self.V

        # Coordinates plus deformations
        nrp = 10+1

        # Define the cubic Hermite shape functions for displacement and rotation
        def N1(s): return 1 - 3*s**2 + 2*s**3
        def N2(s): return L * (s - 2*s**2 + s**3)
        def N3(s): return 3*s**2 - 2*s**3
        def N4(s): return L * (-s**2 + s**3)

        X1beam = X[int(T[beam['consistOfelements'][0], 0]),:]
        X2beam = X[int(T[beam['consistOfelements'][-1], 1]),:]

        AAbeam, _ = self.Abeam(X1beam, X2beam)

        AuBeam = np.zeros((2,2))
        for i in range(0,2):
            for j in range(0,2):
                AuBeam[i][j] = AAbeam[i][j]

        xfine_loc = np.array([])  # Displacement storage
        Us = np.array([])  # Displacement storage

        for el in beam['consistOfelements']:
            # Create transformation matrix
            no1 = int(T[el, 0])
            no2 = int(T[el, 1])
            X1 = X[no1, :]
            X2 = X[no2, :]
            _, L = self.Abeam(X1, X2)

            xy_loc = np.dot(AuBeam, np.transpose(np.array([X1,X2])))
            x_loc = xy_loc[0,:]
            xfine_loc_temp = np.linspace(x_loc[0], x_loc[-1], nrp)  # positions along the beam for plotting

            # Get global deformations
            v = np.zeros(6)
            for i in range(6):
                v[i] = V[int(D[el, i])]

            # make local deformations
            v = np.matmul(AAbeam, v)

            Us_el = np.zeros(nrp)  # Displacement storage
            for i in range(nrp):
                s = i / (nrp - 1)
                Us_el[i] = N1(s)*v[1]+N2(s)*v[2]+N3(s)*v[4]+N4(s)*v[5]

            
            # FIX SÅ DEN GEMMER X COORDINATER RIGTIGT FOR HELE BJÆLKEN
            xfine_loc = np.append(xfine_loc, xfine_loc_temp[:-1])
            Us = np.append(Us, Us_el[:-2])

        xfine_loc = np.append(xfine_loc, xfine_loc_temp[-1])
        Us = np.append(Us, Us_el[-1])

        return xfine_loc, Us


    def getSectionForces(self, beam):
        X = self.X
        T = self.T
        M = self.M
        F1 = self.F1
        F2 = self.F2

        nrp = 10*self.discr+1

        X1beam = X[int(T[beam['consistOfelements'][0], 0]),:]
        X2beam = X[int(T[beam['consistOfelements'][-1], 1]),:]

        AAbeam, _ = self.Abeam(X1beam, X2beam)

        AuBeam = np.zeros((2,2))
        for i in range(0,2):
            for j in range(0,2):
                AuBeam[i][j] = AAbeam[i][j]


        xfine_loc = np.array([])  # Displacement storage
        Mfine = np.array([])
        Vfine = np.array([])
        Nfine = np.array([])

        # Fit a cubic spline to the calculated moments
        for d in range(int(len(beam['consistOfelements'])/self.discr)):

            ele = beam['consistOfelements'][d*self.discr:d*self.discr+self.discr]

            xy = X[T[ele][:,0]]  # positions along the beam
            xy = np.append(xy, [X[T[ele][-1,:]][-1,:]], axis=0)

            xy_loc = np.dot(AuBeam, np.transpose(xy))
            x_loc = xy_loc[0,:]

            Mp = M[ele,:][:,0]
            Mp = np.append(Mp, M[ele[-1],1])

            Vp = F2[ele,:][:,0]
            Vp = np.append(Vp, F2[ele[-1],1])

            Np = F1[ele,:][:,0]
            Np = np.append(Np, F1[ele[-1],1])

            splineM = CubicSpline(x_loc, Mp, bc_type='not-a-knot')
            splineV = CubicSpline(x_loc, Vp, bc_type='not-a-knot')
            splineN = CubicSpline(x_loc, Np, bc_type='not-a-knot')

            xfine_loc_temp = np.linspace(x_loc[0], x_loc[-1], nrp)  # positions along the beam for plotting

            Mfine_temp = splineM(xfine_loc_temp)
            Vfine_temp = splineV(xfine_loc_temp)
            Nfine_temp = splineN(xfine_loc_temp)

            xfine_loc = np.append(xfine_loc, xfine_loc_temp[:-1])
            Mfine = np.append(Mfine, Mfine_temp[:-1])
            Vfine = np.append(Vfine, Vfine_temp[:-1])
            Nfine = np.append(Nfine, Nfine_temp[:-1])

        xfine_loc = np.append(xfine_loc, xfine_loc_temp[-1])
        Mfine = np.append(Mfine, Mfine_temp[-1])
        Vfine = np.append(Vfine, Vfine_temp[-1])
        Nfine = np.append(Nfine, Nfine_temp[-1])

        return xfine_loc, Mfine, Vfine, Nfine
