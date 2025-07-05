# -*- coding: utf-8 -*-
"""
Created on Mon Apr 18 16:38:43 2022

@author: Nicolas
"""

import numpy as np
from Moon2Mars.EC3 import EC3base, EC3calc
from Moon2Mars.EC5 import EC5
from Moon2Mars.EC6 import EC6
from scipy.interpolate import CubicSpline
import copy as copy
import itertools

class S():
    def __init__(self, model, project):
        
        self.model = model
        self.project = project
        self.member = model.member

        self.loadtypes =[]
        self.coor1 = []
        self.coor2 = []
        self.Fxy1 = []
        self.Fxy2 = []
        self.M0 = []
        
        self.loadform = []
        self.loadIds = []

        
    def addLineLoad(self,coor1,coor2,Fxy1,Fxy2,loadtype,loadId):
        
        self.coor1.append(coor1)
        self.coor2.append(coor2)
        self.Fxy1.append(Fxy1)
        self.Fxy2.append(Fxy2)
        self.M0.append([np.nan])
        self.loadtypes.append(loadtype)
        self.loadform.append('lineload')
        self.loadIds.append(loadId)
        
    def addPointLoad(self,coor1,Fxy1,loadtype,loadId):
        
        self.coor1.append(coor1)
        self.coor2.append([np.nan,np.nan])
        self.Fxy1.append(Fxy1)
        self.Fxy2.append([np.nan,np.nan])
        self.M0.append([np.nan])

        self.loadtypes.append(loadtype)
        self.loadform.append('pointload') 
        self.loadIds.append(loadId)
        
    def addMoment(self,coor1,M0,loadtype,loadId):
        self.coor1.append(coor1)
        self.coor2.append([np.nan,np.nan])
        self.Fxy1.append([np.nan,np.nan])
        self.Fxy2.append([np.nan,np.nan])
        self.M0.append(M0)

        self.loadtypes.append(loadtype)
        self.loadform.append('moment')
        self.loadIds.append(loadId)

    def addSelfweight(self):
        self.coor1.append([np.nan,np.nan])
        self.coor2.append([np.nan,np.nan])
        self.Fxy1.append([np.nan,np.nan])
        self.Fxy2.append([np.nan,np.nan])
        self.M0.append([np.nan])

        self.loadtypes.append('Egenlast')
        self.loadform.append('construction')
        self.loadIds.append('All deadloads')
    
    def run(self):

        loadtypes = self.loadtypes
        coor1 = self.coor1
        coor2 = self.coor2
        Fxy1 = np.array(self.Fxy1)
        Fxy2 = np.array(self.Fxy2)
        M0 = np.array(self.M0)
        
        loadform = self.loadform
        self.numOfLoads = len(loadtypes)
        
        self.konsekvensklasse = self.project.CC
        self.n = self.project.nLevelsAbove #antal etager over belastet konstruktion
        
        if self.konsekvensklasse == 'CC1':
            self.KFi = 0.9
        elif self.konsekvensklasse == 'CC2':
            self.KFi = 1.0
        elif self.konsekvensklasse == 'CC3':
            self.KFi = 1.1
            
#####################################################################################################################                   

        self.loadCombinationsFE = {}

        self.loadCombinationsFE_discr = {}
        self.loadCombinationsFE_discr['ULS'] = {}
        self.loadCombinationsFE_discr['SLS'] = {}
        self.loadCombinationsFE_discr['ALS'] = {}

        self.loadCombinations = {}
        self.loadCombinations['ULS'] = {}
        self.loadCombinations['SLS'] = {}
        self.loadCombinations['ALS'] = {}
        
        loadcombMatDict_ULS = {}
        loadcombMatDict_SLS = {}
        loadcombMatDict_ALS = {}

        F1_singleload = {}
        F2_singleload = {}
        M_singleload = {}
        R0_singleload = {}
        Ve_singleload = {}

        F1discr = {}
        F2discr = {}
        Mdiscr = {}
        R0discr = {}
        Vediscr = {}

        # --------- Calculate section forces for each load --------- #
        for i in range(self.numOfLoads):
            #reset loadvectors
            self.model.bL = np.empty((0,2), float)
            self.model.bL_el_map = np.empty((0,2), float)
            self.model.localLoads = np.zeros((np.size(self.model.T,0),6), float)

            if loadform[i] == 'construction':
                self.model.addSelfWeight(1)
            else:
                if loadform[i] == 'pointload':
                    if Fxy1[i][0] != 0:
                        self.model.addLoad(coor1[i], "Fx", Fxy1[i][0])
                    if Fxy1[i][1] != 0:   
                        self.model.addLoad(coor1[i], "Fy", Fxy1[i][1])
                elif loadform[i] == 'lineload':
                    if Fxy1[i][0] != 0 or Fxy2[i][0] != 0:
                        self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1[i][0],Fxy2[i][0])
                    if Fxy1[i][1] != 0 or Fxy2[i][1] != 0:
                        self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1[i][1],Fxy2[i][1])
                elif loadform[i] == 'moment':
                    if M0[i][0] != 0:
                        self.model.addLoad(coor1[i], "M", M0[i][0])

            self.model.run()

            F1_singleload[i] = self.model.F1
            F2_singleload[i] = self.model.F2
            M_singleload[i] = self.model.M
            R0_singleload[i] = self.model.R0
            Ve_singleload[i] = self.model.Ve
  

        # --------- Save section forces for each load combination --------- #                      
        self.loadCombinationsFE['F1'] = F1_singleload
        self.loadCombinationsFE['F2'] = F2_singleload
        self.loadCombinationsFE['M'] = M_singleload
        self.loadCombinationsFE['R0'] = R0_singleload
        self.loadCombinationsFE['Ve'] = Ve_singleload

        singleloadList = F1_singleload.keys()

        # --------- Discretize section forces for each load case --------- #
        # Initialize dictionaries with an empty array for each load case
        firstRow = []
        XFs = np.empty((2,0), float)
        T_discr = np.empty([0,2])
        X_discr = np.empty([0,2])
        X_loc_discr = np.array([])
        member_discr = []
        n=-1
        self.plotDiscr = 10

        for lc in F1_singleload:
            for i, m in enumerate(self.member):
                _, F1temp, _, _ = self.discretizeSectionForces(m, 'F1', lc)
                firstRow = np.append(firstRow, F1temp, axis=0)
            break

        n_columns = len(firstRow)
        F1discr = np.zeros([len(singleloadList), n_columns])
        F2discr = np.zeros([len(singleloadList), n_columns])
        Mdiscr = np.zeros([len(singleloadList), n_columns])
        VediscrX = np.zeros([len(singleloadList), n_columns])
        VediscrY = np.zeros([len(singleloadList), n_columns])
        Vediscr_loc = np.zeros([len(singleloadList), n_columns])

        start = 0
        for i, m in enumerate(self.member):
            for lc in F1_singleload:
                _, F1temp, _, _ = self.discretizeSectionForces(m, 'F1', lc)
                F1discr[lc,start:start+len(F1temp)] = F1temp

                _, F2temp, _, _ = self.discretizeSectionForces(m, 'F2', lc)
                F2discr[lc,start:start+len(F2temp)] = F2temp

                _, Mtemp, _, _ = self.discretizeSectionForces(m, 'M', lc)
                Mdiscr[lc,start:start+len(Mtemp)] = Mtemp

                Vetemp, Ve_loc_temp = self.getDeformation(m, lc)
                VediscrX[lc,start:start+len(Vetemp[:,0])] = Vetemp[:,0]
                VediscrY[lc,start:start+len(Vetemp[:,1])] = Vetemp[:,1]
                Vediscr_loc[lc,start:start+len(Ve_loc_temp[:,1])] = Ve_loc_temp[:,1]

            start += len(F1temp)

            xfine_loc, _, AuBeam, X1beam = self.discretizeSectionForces(m, 'F1', lc)
            XY = np.dot(np.transpose(AuBeam), [xfine_loc,np.zeros(len(xfine_loc))]) 
            XFs = XY + np.tile(np.array([[X1beam[0]], [X1beam[1]]]), (1, np.size(XY,1)))
            n+=1
            #aaa=1
            #XFs = np.append(XFs, XFs_temp, axis=1)

            nElements = np.size(XFs,1) - 1
            iniSizeT = np.size(T_discr,0)+n
            iniSizeMem = np.size(T_discr,0)
            T_discr = np.append(T_discr, np.array([[i, i+1] for i in range(iniSizeT, iniSizeT+nElements)]), axis=0)
            
            X_discr = np.append(X_discr, np.transpose(XFs), axis=0)
            X_loc_discr = np.append(X_loc_discr, xfine_loc, axis=0)

            m_temp = copy.deepcopy(m)
            m_temp['consistOfelements'] = np.arange(iniSizeMem, iniSizeMem+nElements)
            m_temp['AuBeam'] = AuBeam
            m_temp['X1beam'] = X1beam
            member_discr.append(m_temp)

        self.T_discr = T_discr.astype(int)
        self.X_discr = X_discr
        self.X_loc_discr = X_loc_discr
        self.member_discr = member_discr
        R0_singleload_mat = np.array(list(self.loadCombinationsFE['R0'].values()))

        self.R0_type = np.empty(len(self.model.U), dtype=object)
        self.R0_coordinates = np.empty([len(self.model.U), 2], dtype=float)
        for i in range(len(self.model.U)):
            self.R0_type[i] = 'x' if self.model.U[i]%3 == 0 else 'y' if self.model.U[i]%3 == 1 else 'r'
            self.R0_coordinates[i,:] = self.model.X[np.floor(self.model.U[i]/3).astype(int),:] # R0 er i x, y eller r retning, afhængig af U. U er 0,1 eller 2 for hhv. x,y,r retning. R0_coordinates er det element som R0 er i, dvs. 0,1,2 for hhv. x,y,r retning

        aaa=1
        ########################################################## --------------- LIMIT STATES ------------- ###############################################################

        # --------- Calculate section forces for each load combination using superposition-principle on section forces etc. --------- #
        domList = list(dict.fromkeys(loadtypes))
        domList.sort()
        loadtypesIndices = {}
        for dom in domList:
            loadtypesIndices[dom] = np.array([index for index, item in enumerate(loadtypes) if item == dom])

        # --------- Generate load combinations --------- #

        combinations_matrix = self.generate_load_combinations(loadtypes, loadtypesIndices['Egenlast'])


        # Load factors
        psi_0 = {'Nyttelast': 0.5, 'Snelast, med kat E eller dom temp': 0.6, 'Snelast, dom vind': 0, 'Snelast': 0.3, 'Vindlast, med kat E': 0.6, 'Vindlast': 0.3, 'Temperaturlast': 0.6}
        psi_1 = {'Nyttelast': 0.3, 'Snelast, med kat E eller dom temp': 0.2, 'Snelast, dom vind': 0, 'Snelast': 0.2, 'Vindlast, med kat E': 0.2, 'Vindlast': 0.2, 'Temperaturlast': 0.5}
        psi_2 = {'Nyttelast': 0.2, 'Snelast, med kat E eller dom temp': 0,   'Snelast, dom vind': 0, 'Snelast': 0,   'Vindlast, med kat E': 0,   'Vindlast': 0,   'Temperaturlast': 0}
        
        gamma_Gjsup_6_10a = 1.2
        gamma_Gjinf_6_10a = 1.0
        gamma_Gjsup_6_10b = 1.0
        gamma_Gjinf_6_10b = 0.9
        
        gamma_Q1 = 1.5

        ########################################################## --------------- ULS ------------- ###############################################################

        F1 = {}
        F2 = {}
        M = {}
        R0 = {}
        Ve = {}
        Ve_loc = {}

        c = 0
        for dom in domList:
            # Tabel A1.2(B+C) DK NA Regningsmæssige lastværdier for vedvarende og midlertidige dimensioneringstilfælde (STR/GEO) (sæt B og C)
            if dom == 'Egenlast': # Lastkombination 1 (6.10a)
                for gamma_Gj in [gamma_Gjsup_6_10a, gamma_Gjinf_6_10a]:
                    loadcombMat = np.zeros([1,len(loadtypes)])
                    loadcombMat[:, loadtypesIndices['Egenlast']] = 1

                    # Tyngde, generelt
                    if gamma_Gj == gamma_Gjsup_6_10a:
                        loadcombMat[:, loadtypesIndices['Egenlast']] *= gamma_Gj*self.KFi              
                        name = 'Tyngde, generelt - Ugunstig - (6.10a)'
                    else: # gamma_Gjinf
                        loadcombMat[:, loadtypesIndices['Egenlast']] *= gamma_Gj
                        name = 'Tyngde, generelt - Gunstig - (6.10a)'                                                      # Uden KFi! Tyngde, generelt

                    for loadtype in loadtypesIndices:
                        if loadtype != 'Egenlast':
                            loadcombMat[:, loadtypesIndices[loadtype]] *= 0

                    F1_mat = np.matmul(loadcombMat, F1discr)
                    F2_mat = np.matmul(loadcombMat, F2discr)
                    M_mat = np.matmul(loadcombMat, Mdiscr)
                    VeX_mat = np.matmul(loadcombMat, VediscrX)
                    VeY_mat = np.matmul(loadcombMat, VediscrY)
                    Ve_loc_mat = np.matmul(loadcombMat, Vediscr_loc)
                    R0_mat = np.matmul(loadcombMat, R0_singleload_mat)

                    domname = name
                    for i in range(np.size(loadcombMat,0)):
                        comb = 'Komb. ' + str(c+1) + '. ' + domname
                        F1[comb] = F1_mat[i,:]
                        F2[comb] = F2_mat[i,:]
                        M[comb] = M_mat[i,:]
                        Ve[comb] = np.array([VeX_mat[i,:], VeY_mat[i,:]]).T
                        Ve_loc[comb] = Ve_loc_mat[i,:]
                        R0[comb] = R0_mat[i,:]
                        loadcombMatDict_ULS[comb] = loadcombMat[i,:]
                        c += 1

            else: # Lastkombination 2 (6.10b)
                for gamma_Gj in [gamma_Gjsup_6_10b, gamma_Gjinf_6_10b]:
                    loadcombMat = copy.deepcopy(combinations_matrix)

                    # Tyngde, generelt
                    if gamma_Gj == gamma_Gjsup_6_10b:
                        loadcombMat[:, loadtypesIndices['Egenlast']] *= gamma_Gj*self.KFi               
                        name = 'Tyngde, generelt - Ugunstig - (6.10b)'
                    else: # gamma_Gjinf
                        loadcombMat[:, loadtypesIndices['Egenlast']] *= gamma_Gj                        # Uden KFi! Tyngde, generelt
                        name = 'Tyngde, generelt - Gunstig - (6.10b)'

                    # Dominerende last
                    if dom == 'Nyttelast':
                        alpha_n = (1+(self.n-1)*psi_0[dom])/self.n
                    else:
                        alpha_n = 1
                    loadcombMat[:, loadtypesIndices[dom]] *= gamma_Q1*alpha_n*self.KFi   

                    # Øvrige laster                  
                    for loadtype in loadtypesIndices:
                        if loadtype != 'Egenlast' and loadtype != dom:
                            if loadtype == 'Snelast' and dom == 'Vindlast':
                                loadcombMat[:, loadtypesIndices[loadtype]] *= gamma_Q1*psi_0['Snelast, dom vind']*self.KFi    
                            else:
                                loadcombMat[:, loadtypesIndices[loadtype]] *= gamma_Q1*psi_0[loadtype]*self.KFi               


                    F1_mat = np.matmul(loadcombMat, F1discr)
                    F2_mat = np.matmul(loadcombMat, F2discr)
                    M_mat = np.matmul(loadcombMat, Mdiscr)
                    VeX_mat = np.matmul(loadcombMat, VediscrX)
                    VeY_mat = np.matmul(loadcombMat, VediscrY)
                    Ve_loc_mat = np.matmul(loadcombMat, Vediscr_loc)
                    R0_mat = np.matmul(loadcombMat, R0_singleload_mat)

                    domname = dom + ' dominerende - ' + name
                    for i in range(np.size(loadcombMat,0)):
                        comb = 'Komb. ' + str(c+1) + '. ' + domname
                        F1[comb] = F1_mat[i,:]
                        F2[comb] = F2_mat[i,:]
                        M[comb] = M_mat[i,:]
                        Ve[comb] = np.array([VeX_mat[i,:], VeY_mat[i,:]]).T
                        Ve_loc[comb] = Ve_loc_mat[i,:]
                        R0[comb] = R0_mat[i,:]
                        loadcombMatDict_ULS[comb] = loadcombMat[i,:]
                        c += 1

                
        self.loadCombinationsFE_discr['ULS'] = {
            'F1': F1,
            'F2': F2,
            'M':  M,
            'R0': R0,
            'Ve': Ve,
            'Ve_loc': Ve_loc
        }


        ########################################################## --------------- ALS ------------- ###############################################################
        
        F1 = {}
        F2 = {}
        M = {}
        R0 = {}
        Ve = {}
        Ve_loc = {}

        for prim in domList:
            #Tabel A1.3 DK NA Regningsmæssige lastværdier til brug ved lastkombinationer ved ulykkesdimensioneringstilstande og seismiske dimensioneringstilstande
            # Dimensioneringstilfælde: Brand
            loadcombMat = copy.deepcopy(combinations_matrix)

            # Dominerende last, A_d - ikke nødvendig for nu

            # Ikke-dominerende laster:
            # Primær last
            if prim != 'Egenlast':
                loadcombMat[:, loadtypesIndices[prim]] *= psi_1[prim]
            # Andre laster                  
            for loadtype in loadtypesIndices:
                if loadtype != 'Egenlast' and loadtype != prim:
                        loadcombMat[:, loadtypesIndices[loadtype]] *= psi_2[loadtype] #Bemærk ikke kombineret med nogen dominerende last, men derimod primær last. Derfor f.eks. ikke anvend "Snelast, dom vind"        

            F1_mat = np.matmul(loadcombMat, F1discr)
            F2_mat = np.matmul(loadcombMat, F2discr)
            M_mat = np.matmul(loadcombMat, Mdiscr)
            VeX_mat = np.matmul(loadcombMat, VediscrX)
            VeY_mat = np.matmul(loadcombMat, VediscrY)
            Ve_loc_mat = np.matmul(loadcombMat, Vediscr_loc)
            R0_mat = np.matmul(loadcombMat, R0_singleload_mat)

            domname = prim + ' primær - Brand - (6.11a/b)'
            for i in range(np.size(loadcombMat,0)):
                comb = 'Komb. ' + str(i+1) + '. ' + domname
                F1[comb] = F1_mat[i,:]
                F2[comb] = F2_mat[i,:]
                M[comb] = M_mat[i,:]
                Ve[comb] = np.array([VeX_mat[i,:], VeY_mat[i,:]]).T
                Ve_loc[comb] = Ve_loc_mat[i,:]
                R0[comb] = R0_mat[i,:]
                loadcombMatDict_ALS[comb] = loadcombMat[i,:]

        self.loadCombinationsFE_discr['ALS'] = {
            'F1': F1,
            'F2': F2,
            'M':  M,
            'R0': R0,
            'Ve': Ve,
            'Ve_loc': Ve_loc
        }

        ########################################################## --------------- SLS ------------- ###############################################################

        F1 = {}
        F2 = {}
        M = {}
        R0 = {}
        Ve = {}
        Ve_loc = {}
        
        gamma_Gjsup = 1.0
        # for SLScombtype in ['Karakteristisk', 'Hyppig', 'Kvasipermanent']:
        #     for dom in domList:
        #         for gamma_Gj in [gamma_Gjsup]:
        #             loadcombMat = copy.deepcopy(combinations_matrix)

        #             # Tyngde, generelt
        #             if gamma_Gj == gamma_Gjsup:
        #                 loadcombMat[:, loadtypesIndices['Egenlast']] *= gamma_Gj               
        #                 name = 'Tyngde, Ugunstig'

        #             # Dominerende last
        #             # if SLScombtype == 'Karakteristisk':
        #             #     loadcombMat[:, loadtypesIndices[dom]] *= 1                      # (alle laster multipliceres med 1,0, altså intet her)
        #             if dom != 'Egenlast':
        #                 if SLScombtype == 'Hyppig':
        #                     loadcombMat[:, loadtypesIndices[dom]] *= psi_1[dom]
        #                 elif SLScombtype == 'Kvasipermanent':
        #                     loadcombMat[:, loadtypesIndices[dom]] *= psi_2[dom]      
                
        #             # Øvrige laster
        #             for loadtype in loadtypesIndices:
        #                 if loadtype != 'Egenlast' and loadtype != dom:
        #                     if loadtype == 'Snelast' and dom == 'Vindlast':
        #                         if SLScombtype == 'Karakteristisk':
        #                             loadcombMat[:, loadtypesIndices[loadtype]] *= psi_0['Snelast, dom vind']
        #                         elif SLScombtype == 'Hyppig' or SLScombtype == 'Kvasipermanent':
        #                             loadcombMat[:, loadtypesIndices[loadtype]] *= psi_2['Snelast, dom vind']                                                                                                  
        #                     else:
        #                         if SLScombtype == 'Karakteristisk':
        #                             loadcombMat[:, loadtypesIndices[loadtype]] *= psi_0[loadtype]
        #                         elif SLScombtype == 'Hyppig' or SLScombtype == 'Kvasipermanent':
        #                             loadcombMat[:, loadtypesIndices[loadtype]] *= psi_2[loadtype]

        #             F1_mat = np.matmul(loadcombMat, F1discr)
        #             F2_mat = np.matmul(loadcombMat, F2discr)
        #             M_mat = np.matmul(loadcombMat, Mdiscr)
        #             VeX_mat = np.matmul(loadcombMat, VediscrX)
        #             VeY_mat = np.matmul(loadcombMat, VediscrY)
        #             Ve_loc_mat = np.matmul(loadcombMat, Vediscr_loc)

        #             domname = SLScombtype + ' - ' + dom + ' dominerende - ' + name
        #             for i in range(np.size(loadcombMat,0)):
        #                 comb = domname + ' - Komb. ' + str(i+1)
        #                 F1[comb] = F1_mat[i,:]
        #                 F2[comb] = F2_mat[i,:]
        #                 M[comb] = M_mat[i,:]
        #                 Ve[comb] = np.array([VeX_mat[i,:], VeY_mat[i,:]]).T
        #                 Ve_loc[comb] = Ve_loc_mat[i,:]
        #                 loadcombMatDict_SLS[comb] = loadcombMat[i,:]

        for SLScombtype in ['Karakteristisk']:
            for dom in domList:
                loadtypesIndicesOneLoadtype ={}
                loadtypesIndicesOneLoadtype = {dom: loadtypesIndices[dom]}
                loadcombMat = self.generate_load_combinations_SLS_DKNA(loadtypes, loadtypesIndicesOneLoadtype)

                F1_mat = np.matmul(loadcombMat, F1discr)
                F2_mat = np.matmul(loadcombMat, F2discr)
                M_mat = np.matmul(loadcombMat, Mdiscr)
                VeX_mat = np.matmul(loadcombMat, VediscrX)
                VeY_mat = np.matmul(loadcombMat, VediscrY)
                Ve_loc_mat = np.matmul(loadcombMat, Vediscr_loc)
                R0_mat = np.matmul(loadcombMat, R0_singleload_mat)

                domname = SLScombtype + ', ' + dom + ' alene'
                for i in range(np.size(loadcombMat,0)):
                    comb = 'Komb. ' + str(i+1) + '. ' + domname
                    F1[comb] = F1_mat[i,:]
                    F2[comb] = F2_mat[i,:]
                    M[comb] = M_mat[i,:]
                    Ve[comb] = np.array([VeX_mat[i,:], VeY_mat[i,:]]).T
                    Ve_loc[comb] = Ve_loc_mat[i,:]
                    R0[comb] = R0_mat[i,:]
                    loadcombMatDict_SLS[comb] = loadcombMat[i,:]

        self.loadCombinationsFE_discr['SLS'] = {
            'F1': F1,
            'F2': F2,
            'M':  M,
            'R0': R0,
            'Ve': Ve,
            'Ve_loc': Ve_loc
        }


        # --------- Calculate utilization ratios --------- #

        self.initMemberECobj = [None]*len(self.member_discr)
        
        for comb in self.loadCombinationsFE_discr['ULS']['F1']:
            self.loadCombinations['ULS'][comb] = self.getURvalues(comb, 'ULS')

        for comb in self.loadCombinationsFE_discr['SLS']['F1']:
            self.loadCombinations['SLS'][comb] = self.getURvalues(comb, 'SLS')

        for comb in self.loadCombinationsFE_discr['ALS']['F1']:
            self.loadCombinations['ALS'][comb] = self.getURvalues(comb, 'ALS') #ALS er ikke implementeret endnu, så vi bruger ULS. Først nødvendigt når kipning skal medtages, da der så skal itereres mht. ståltemp og udnyttelse


       #______________________________________________________________________________________________________________________#
        self.sectionResultsFull = []
        self.sectionResultsMember = []
        self.sectionResults = []
        nMembers = len(self.loadCombinations['ULS'][list(self.loadCombinations['ULS'].keys())[0]])
        for i in range(nMembers):
            section = {}
            sectionFull = {}
            sectionMember = {}
            loadCombUR_ULS = {}
            loadCombUR_SLS = {}
            loadCombUR_ALS = {}
            URnames_ULS = []
            URnames_SLS = []
            URnames_ALS = []
            LoadCombnames_ULS = []
            LoadCombnames_SLS = []
            LoadCombnames_ALS = []

            for combination in self.loadCombinations['ULS']:
                URs_ULS = {}
                b = self.loadCombinations['ULS'][combination][i]
                for URs in b.UR:
                    URs_ULS[URs] = b.UR[URs]
                    LoadCombnames_ULS.append(combination)
                    URnames_ULS.append(URs)

                loadCombUR_ULS[combination] = URs_ULS

            for combination in self.loadCombinations['SLS']:
                URs_SLS = {}
                b = self.loadCombinations['SLS'][combination][i]
                for URs in b.UR:
                    URs_SLS[URs] = b.UR[URs]
                    LoadCombnames_SLS.append(combination)
                    URnames_SLS.append(URs)

                loadCombUR_SLS[combination] = URs_SLS

            for combination in self.loadCombinations['ALS']:
                URs_ALS = {}
                b = self.loadCombinations['ALS'][combination][i]
                for URs in b.UR:
                    URs_ALS[URs] = b.UR[URs]
                    LoadCombnames_ALS.append(combination)
                    URnames_ALS.append(URs)

                loadCombUR_ALS[combination] = URs_ALS
            
            URnames_ULS = list(dict.fromkeys(URnames_ULS))
            URnames_SLS = list(dict.fromkeys(URnames_SLS))
            URnames_ALS = list(dict.fromkeys(URnames_ALS))

            LoadCombnames_ULS = list(dict.fromkeys(LoadCombnames_ULS))
            LoadCombnames_SLS = list(dict.fromkeys(LoadCombnames_SLS))
            LoadCombnames_ALS = list(dict.fromkeys(LoadCombnames_ALS))
           
            UR_loadcomb_mat_ULS = np.zeros([len(URnames_ULS),len(LoadCombnames_ULS)])           
            UR_loadcomb_mat_SLS = np.zeros([len(URnames_SLS),len(LoadCombnames_SLS)])
            UR_loadcomb_mat_ALS = np.zeros([len(URnames_ALS),len(LoadCombnames_ALS)])
            
            
            for ii in range(np.size(UR_loadcomb_mat_ULS,0)):
                for iii in range(np.size(UR_loadcomb_mat_ULS,1)):
                    UR_loadcomb_mat_ULS[ii,iii] = loadCombUR_ULS[LoadCombnames_ULS[iii]][URnames_ULS[ii]]

            for ii in range(np.size(UR_loadcomb_mat_SLS,0)):
                for iii in range(np.size(UR_loadcomb_mat_SLS,1)):
                    UR_loadcomb_mat_SLS[ii,iii] = loadCombUR_SLS[LoadCombnames_SLS[iii]][URnames_SLS[ii]]
                    
            for ii in range(np.size(UR_loadcomb_mat_ALS,0)):
                for iii in range(np.size(UR_loadcomb_mat_ALS,1)):
                    UR_loadcomb_mat_ALS[ii,iii] = loadCombUR_ALS[LoadCombnames_ALS[iii]][URnames_ALS[ii]]
            
            if not UR_loadcomb_mat_ULS.size==0:
                maxArg_ULS = np.argmax(UR_loadcomb_mat_ULS,1)
            if not UR_loadcomb_mat_SLS.size==0:
                maxArg_SLS = np.argmax(UR_loadcomb_mat_SLS,1)
            if not UR_loadcomb_mat_ALS.size==0:
                maxArg_ALS = np.argmax(UR_loadcomb_mat_ALS,1)
            

            UR_loadcomb_mat_ULS_member, LoadCombnames_ULS_member, top_indices = self.getTopXValuesPerRow_ULS(UR_loadcomb_mat_ULS, 1, LoadCombnames_ULS)

            sectionFull['URnames_ULS'] = URnames_ULS
            sectionFull['LoadCombnames_ULS'] = LoadCombnames_ULS
            sectionFull['UR_loadcomb_mat_ULS'] = UR_loadcomb_mat_ULS

            sectionMember['URnames_ULS'] = URnames_ULS
            sectionMember['LoadCombnames_ULS'] = LoadCombnames_ULS_member
            sectionMember['UR_loadcomb_mat_ULS'] = UR_loadcomb_mat_ULS_member
            sectionMember['UR_loadcomb_top_indices_ULS'] = top_indices


            UR_loadcomb_mat_SLS_member, LoadCombnames_SLS_member, top_indices = self.getTopXValuesPerRow_SLS(UR_loadcomb_mat_SLS, domList, LoadCombnames_SLS)

            sectionFull['URnames_SLS'] = URnames_SLS
            sectionFull['LoadCombnames_SLS'] = LoadCombnames_SLS
            sectionFull['UR_loadcomb_mat_SLS'] = UR_loadcomb_mat_SLS

            sectionMember['URnames_SLS'] = URnames_SLS
            sectionMember['LoadCombnames_SLS'] = LoadCombnames_SLS_member
            sectionMember['UR_loadcomb_mat_SLS'] = UR_loadcomb_mat_SLS_member
            sectionMember['UR_loadcomb_top_indices_SLS'] = top_indices


            UR_loadcomb_mat_ALS_member, LoadCombnames_ALS_member, top_indices = self.getTopXValuesPerRow_ULS(UR_loadcomb_mat_ALS, 1, LoadCombnames_ALS)

            sectionFull['URnames_ALS'] = URnames_ALS
            sectionFull['LoadCombnames_ALS'] = LoadCombnames_ALS
            sectionFull['UR_loadcomb_mat_ALS'] = UR_loadcomb_mat_ALS

            sectionMember['URnames_ALS'] = URnames_ALS
            sectionMember['LoadCombnames_ALS'] = LoadCombnames_ALS_member
            sectionMember['UR_loadcomb_mat_ALS'] = UR_loadcomb_mat_ALS_member
            sectionMember['UR_loadcomb_top_indices_ALS'] = top_indices
            
            
            # section['URnames_ALS'] = URnames_ALS
            # section['LoadCombnames_ALS'] = LoadCombnames_ALS
            # section['UR_loadcomb_mat_ALS'] = UR_loadcomb_mat_ALS
            

            self.sectionResultsFull.append(sectionFull)
            self.sectionResultsMember.append(sectionMember)

        tempIndices_ULS = [
            idx
            for member in self.sectionResultsMember
            for idx in member['UR_loadcomb_top_indices_ULS']
        ]
        unique_vals_ULS, _ = np.unique(tempIndices_ULS, return_index=True)

        tempIndices_SLS = [
            idx
            for member in self.sectionResultsMember
            for idx in member['UR_loadcomb_top_indices_SLS']
        ]
        unique_vals_SLS, _ = np.unique(tempIndices_SLS, return_index=True)

        tempIndices_ALS = [
            idx
            for member in self.sectionResultsMember
            for idx in member['UR_loadcomb_top_indices_ALS']
        ]
        unique_vals_ALS, _ = np.unique(tempIndices_ALS, return_index=True)

        for i in range(len(self.sectionResultsMember)):
            section = {}
            UR_CriticalLoadComb_ULS = {}
            UR_CriticalLoadComb_SLS = {}
            UR_CriticalLoadComb_ALS = {}

            section['URnames_ULS'] = self.sectionResultsFull[i]['URnames_ULS']
            section['LoadCombnames_ULS'] = list(np.array(self.sectionResultsFull[i]['LoadCombnames_ULS'])[unique_vals_ULS])
            section['UR_loadcomb_mat_ULS'] = self.sectionResultsFull[i]['UR_loadcomb_mat_ULS'][:,unique_vals_ULS]

            section['URnames_SLS'] = self.sectionResultsFull[i]['URnames_SLS']
            section['LoadCombnames_SLS'] = list(np.array(self.sectionResultsFull[i]['LoadCombnames_SLS'])[unique_vals_SLS])
            section['UR_loadcomb_mat_SLS'] = self.sectionResultsFull[i]['UR_loadcomb_mat_SLS'][:,unique_vals_SLS]

            section['URnames_ALS'] = self.sectionResultsFull[i]['URnames_ALS']
            section['LoadCombnames_ALS'] = list(np.array(self.sectionResultsFull[i]['LoadCombnames_ALS'])[unique_vals_ALS])
            section['UR_loadcomb_mat_ALS'] = self.sectionResultsFull[i]['UR_loadcomb_mat_ALS'][:,unique_vals_ALS]

            if not section['UR_loadcomb_mat_ULS'].size==0:
                maxArg_ULS = np.argmax(section['UR_loadcomb_mat_ULS'],1)
            if not section['UR_loadcomb_mat_ULS'].size==0:
                for ii in range(len(maxArg_ULS)):
                    UR_CriticalLoadComb_ULS[section['URnames_ULS'][ii]] = section['LoadCombnames_ULS'][maxArg_ULS[ii]]


            if not section['UR_loadcomb_mat_SLS'].size==0:
                maxArg_SLS = np.argmax(section['UR_loadcomb_mat_SLS'],1)
            if not section['UR_loadcomb_mat_SLS'].size==0:
                for ii in range(len(maxArg_SLS)):
                    UR_CriticalLoadComb_SLS[section['URnames_SLS'][ii]] = section['LoadCombnames_SLS'][maxArg_SLS[ii]]


            if not section['UR_loadcomb_mat_ALS'].size==0:
                maxArg_ALS = np.argmax(section['UR_loadcomb_mat_ALS'],1)
            if not section['UR_loadcomb_mat_ALS'].size==0:
                for ii in range(len(maxArg_ALS)):
                    UR_CriticalLoadComb_ALS[section['URnames_ALS'][ii]] = section['LoadCombnames_ALS'][maxArg_ALS[ii]]


            section['UR_CriticalLoadComb_ULS'] = UR_CriticalLoadComb_ULS
            section['UR_CriticalLoadComb_SLS'] = UR_CriticalLoadComb_SLS
            section['UR_CriticalLoadComb_ALS'] = UR_CriticalLoadComb_ALS


            loadcombMatDict_reduced = {}
            for loadcomb in section['LoadCombnames_ULS']:
                loadcombMatDict_reduced[loadcomb] = loadcombMatDict_ULS[loadcomb]
            section['loadcombMatDict_ULS'] = loadcombMatDict_reduced


            loadcombMatDict_reduced = {}
            for loadcomb in section['LoadCombnames_SLS']:
                loadcombMatDict_reduced[loadcomb] = loadcombMatDict_SLS[loadcomb]
            section['loadcombMatDict_SLS'] = loadcombMatDict_reduced 


            loadcombMatDict_reduced = {}
            for loadcomb in section['LoadCombnames_ALS']:
                loadcombMatDict_reduced[loadcomb] = loadcombMatDict_ALS[loadcomb]
            section['loadcombMatDict_ALS'] = loadcombMatDict_reduced           
            
            
            section['loadIds'] = self.loadIds
            self.sectionResults.append(section)

        aaa=1


##########################################################################################################################
   

    def getURvalues(self, lc, typeOfState):
        memberList = []
        for i in range(len(self.member_discr)):
            member = self.member_discr[i]
            memberprop = member['memberprop']

            #Only init base once per member (for speed)
            if self.initMemberECobj[i] == None:
                if member['membertype'] == 'Stål':
                    self.initMemberECobj[i] = EC3base(self, member)
                elif member['membertype'] == 'Murværk':
                    self.initMemberECobj[i] = EC6(self.model, member, self.project)


            ECbaseObj = self.initMemberECobj[i] # base object
            if member['membertype'] == 'Stål':
                ECcalcObj = EC3calc(ECbaseObj)      # object containing methods for calculations
            elif member['membertype'] == 'Træ':
                ECcalcObj = EC5(self, member)
            elif member['membertype'] == 'Murværk':
                ECcalcObj = EC3calc(ECbaseObj)      # object containing methods for calculations

            
            # Instead of assigning attributes to ECobj, just store them locally:
            F1 = self.loadCombinationsFE_discr[typeOfState]['F1'][lc][self.T_discr[member['consistOfelements']]]
            F2 = self.loadCombinationsFE_discr[typeOfState]['F2'][lc][self.T_discr[member['consistOfelements']]]
            M  = self.loadCombinationsFE_discr[typeOfState]['M'][lc][self.T_discr[member['consistOfelements']]]
            Ve = self.loadCombinationsFE_discr[typeOfState]['Ve'][lc][self.T_discr[member['consistOfelements']]]

            ECcalcObj.F1 = F1
            ECcalcObj.F2 = F2
            ECcalcObj.M  = M
            ECcalcObj.Ve = Ve

            if member['membertype'] == 'Stål':
                if 'RH' not in memberprop['profile']:
                    if typeOfState == 'ULS' or typeOfState == 'ALS':
                        ECcalcObj.forskydning626()
                        ECcalcObj.boejningsmoment625()
                        ECcalcObj.trykpaavirkedeElementerMedKonstantTvaersnit631()
                        #ECobj.kipning632()
                        ECcalcObj.lokaleTvaergaaendeKraefter617()
                    elif typeOfState == 'SLS':
                        ECcalcObj.deformation()
                    memberList.append(ECcalcObj)
                else:
                    if typeOfState == 'ULS' or typeOfState == 'ALS':
                        ECcalcObj.forskydning626()
                        ECcalcObj.boejningsmoment625()
                        ECcalcObj.trykpaavirkedeElementerMedKonstantTvaersnit631()
                        #ECcalcObj.kipning632()
                    elif typeOfState == 'SLS':
                        ECcalcObj.deformation()
                    memberList.append(ECcalcObj)

            elif member['membertype'] == 'Træ':
                ECcalcObj.dom = lc
                if typeOfState == 'ULS' or typeOfState == 'ALS':
                    ECcalcObj.boejning616(1)
                    ECcalcObj.forskydning617()
                    ECcalcObj.trykVinkelretPaaFibrene615()
                    ECcalcObj.trykParalleltMedFibrene614(1)
                    ECcalcObj.traekParalleltMedFibrene612(1)
                    ECcalcObj.boejningOgTryk624()
                    ECcalcObj.boejningOgTraek623()
                elif typeOfState == 'SLS':
                    ECcalcObj.deformation()
                memberList.append(ECcalcObj)

            elif member['membertype'] == 'Murværk':
                if typeOfState == 'ULS' or typeOfState == 'ALS':
                    ECcalcObj.getParameterStandardMurvaerk()
                    ECcalcObj.excentricitetRitter()
                    ECcalcObj.addPlate()
                    ECcalcObj.koncentreretLastRitter()
                    ECcalcObj.koncentreretLast()
                memberList.append(ECcalcObj)

        return memberList

            
    def discretizeSectionForces(self, member, sectionForceType, loadcomb):
        X = self.model.X
        T = self.model.T
        SF = self.loadCombinationsFE[sectionForceType][loadcomb]
        if sectionForceType == 'M': SF = -SF

        discr = self.model.discr

        nrp = self.plotDiscr*discr+1

        X1beam = X[int(T[member['consistOfelements'][0], 0]),:]
        X2beam = X[int(T[member['consistOfelements'][-1], 1]),:]

        AAbeam, _ = self.Abeam(X1beam, X2beam)

        AuBeam = np.zeros((2,2))
        for i in range(0,2):
            for j in range(0,2):
                AuBeam[i][j] = AAbeam[i][j]

        xfine_loc = np.array([])  # Displacement storage
        SFfine = np.array([])

        # Fit a cubic spline to the calculated moments
        for d in range(int(len(member['consistOfelements'])/discr)):
            ele = member['consistOfelements'][d*discr:d*discr+discr]

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

            xfine_loc = np.append(xfine_loc, xfine_loc_temp)
            SFfine = np.append(SFfine, SFfine_temp)
            
        # xfine_loc = np.append(xfine_loc, xfine_loc_temp[-1])
        # SFfine = np.append(SFfine, SFfine_temp[-1])

        SFfine[abs(SFfine) < 10**-6] = 0

        return xfine_loc, SFfine, AuBeam, X1beam 
        
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
     
    def getDeformation(self, member, loadcomb):
        X = self.model.X
        T = self.model.T
        Ve = self.loadCombinationsFE['Ve'][loadcomb]
        defArray_global = np.empty((0, 2))
        defArray_local = np.empty((0, 2))
        posDefArray = np.empty((0, 2))

        discr = self.model.discr
       
        nrp = self.plotDiscr+1 #SKAL MATCHE discretizeSectionForces --> self.plotDiscr + 1

        for d in range(int(len(member['consistOfelements'])/discr)):
            for k, el in enumerate(member['consistOfelements'][d*discr:d*discr+discr]):
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
                v = Ve[el,:]

                # make local deformations
                v = np.matmul(A, v)

                Xx = np.zeros((2, nrp))
                Xs = np.zeros((2, nrp))
                Us_g = np.zeros((2, nrp))  # Displacement storage
                Us_l = np.zeros((2, nrp))
                for i in range(nrp):
                    s = i / (nrp - 1)

                    N = [[1-s, 0, 0, s, 0, 0],
                        [0, 1 - 3 * s**2 + 2 * s**3, (s-2*s**2+s**3)*L, 0, 3*s**2-2*s**3, (-s**2+s**3)*L]]
                    
                    Us_l[:,i] = np.dot(N,v)
                    Us_g[:,i] = np.dot(np.transpose(Au),np.dot(N,v)) # Displacement storage
                    Xx[:,i] = np.transpose(X[int(T[el,0]),:])*(1-s) + np.transpose(X[int(T[el,1]),:])*s # positions along the beam for plotting
                    Xs[:,i] = Xx[:,i] + Us_g[:,i] #position and displacement


                if k == 0:
                    defArray_global_temp = np.transpose(Us_g)
                    defArray_local_temp = np.transpose(Us_l)
                    posDefArray_temp = np.transpose(Xs)
                else:
                    defArray_global_temp = np.append(defArray_global_temp, np.transpose(Us_g[:,1:]), axis=0)
                    defArray_local_temp = np.append(defArray_local_temp, np.transpose(Us_l[:,1:]), axis=0)
                    posDefArray_temp = np.append(posDefArray_temp, np.transpose(Xs[:,1:]), axis=0)

            defArray_global = np.append(defArray_global, defArray_global_temp, axis=0)
            defArray_local = np.append(defArray_local, defArray_local_temp, axis=0)
            posDefArray = np.append(posDefArray, posDefArray_temp, axis=0)

        end1 = posDefArray[0,:]
        end2 = posDefArray[-1,:]

        A_end2end, L_end2end = self.Abeam(end1, end2)

        Au = np.zeros((2,2))
        for i in range(0,2):
            for j in range(0,2):
                Au[i][j] = A_end2end[i][j]

        defArray_end2end_local = np.transpose(np.matmul(Au, np.transpose(posDefArray)))
        defArray_end2end_local = np.array([
            defArray_end2end_local[:,0] - defArray_end2end_local[0,0],
            defArray_end2end_local[:,1] - defArray_end2end_local[0,1]
        ]).T

        return defArray_global, defArray_end2end_local
    
    def generate_load_combinations(self, loads, indicesDeadload):
        n = len(loads)  # Number of loads
        # Generate all combinations using binary representation (0 and 1)
        combinations = list(itertools.product([0, 1], repeat=n))
        # Convert list of tuples to a numpy matrix for easier calculations
        matrix = np.array(combinations, float)
        matrix[:,indicesDeadload] = 1.0 # Always include dead loads in all combinations
        matrix = matrix[~(matrix == 0).all(axis=1)]
        return np.unique(matrix, axis=0) #remove repetitions
    
    def generate_load_combinations_SLS_DKNA(self, loads, loadtypesIndices):
        # Initialize an empty matrix to stack all load type combinations
        final_matrix = np.empty((0, len(loads)), dtype=float)
        for loadtype in loadtypesIndices:
            if loadtype == 'Egenlast':
                matrix = np.zeros((1, len(loads)), dtype=float)
                matrix[:, loadtypesIndices[loadtype]] = 1
            else:
                indices = loadtypesIndices[loadtype]
                num_combinations = 2 ** len(indices)
                # Generate all combinations for the current loadtype columns
                combinations = list(itertools.product([0, 1], repeat=len(indices)))
                # Create a matrix of zeros (non-current loadtype columns remain zero)
                matrix = np.zeros((num_combinations, len(loads)), dtype=float)
                # Fill current loadtype columns with generated combinations
                for row, comb in enumerate(combinations):
                    for idx, val in zip(indices, comb):
                        matrix[row, idx] = val
            # Append the matrix for the current loadtype to the final matrix
            final_matrix = np.vstack((final_matrix, matrix))

        # Remove rows with all zeros (no load)
        final_matrix = final_matrix[~(final_matrix == 0).all(axis=1)]
        return final_matrix
    
    
    
    def groupLoads(self, loadIndices, loadcombMat):
        row_mask = np.any(loadcombMat[:, loadIndices] == 1, axis=1)
        row_ids = np.where(row_mask)[0]
        col_ids = loadIndices
        loadcombMat[row_ids[:, None], col_ids] = 1
        loadcombMat[~(loadcombMat == 0).all(axis=1)]
        return np.unique(loadcombMat, axis=0) #remove repetitions
    

    def getTopXValuesPerRow_ULS(self, UR_loadcomb_mat, x, LoadCombnames):
        import numpy as np
        n_rows, _ = UR_loadcomb_mat.shape
        # 1. Collect top x distinct column indices per row
        row_col_indices = []
        for i in range(n_rows):
            row = UR_loadcomb_mat[i, :]
            unique_vals = np.unique(row)
            sorted_vals = np.sort(unique_vals)[::-1]
            chosen_vals = sorted_vals[:x] if len(sorted_vals) >= x else sorted_vals
            col_indices = []
            for val in chosen_vals:
                # Get all columns with this value, pick the first to avoid duplicates
                all_cols = np.where(row == val)[0]
                if len(all_cols) > 0:
                    col_indices.append(all_cols[0])
            row_col_indices.append(col_indices)

        # 2. Gather all column indices used by any row
        all_indices = sorted(set(idx for col_list in row_col_indices for idx in col_list))

        # 3. Create new top_values and top_names
        top_values = np.zeros((n_rows, len(all_indices)), dtype=float)
        top_names = [LoadCombnames[i] for i in all_indices]

        # 4. Fill top_values
        for i in range(n_rows):
            row = UR_loadcomb_mat[i, :]
            for j, col in enumerate(all_indices):
                top_values[i, j] = row[col]

        top_indices = all_indices  # indices in the original matrix
        return top_values, top_names, top_indices
    

    def getTopXValuesPerRow_SLS(self, UR_loadcomb_mat, domList, LoadCombnames_SLS):
        import numpy as np
        n_rows, _ = UR_loadcomb_mat.shape
        categories = domList
        # Pre-calculate candidate column indices per category
        cat_to_cols = {cat: [j for j, name in enumerate(LoadCombnames_SLS) if cat in name] for cat in categories}
        if all(len(cols) == 0 for cols in cat_to_cols.values()):
            return np.zeros((n_rows, 0)), [], []
        
        # For each row, choose the candidate column (if exists) with the max value per category
        row_selected = []  # list of dict: {category: candidate_index}
        for i in range(n_rows):
            sel = {}
            for cat in categories:
                cols = cat_to_cols[cat]
                if cols:
                    values = UR_loadcomb_mat[i, cols]
                    if values.size > 0:
                        max_pos = np.argmax(values)
                        sel[cat] = cols[max_pos]
            row_selected.append(sel)
        
        # Union candidate indices from all rows (preserving category order)
        union_indices = []
        for sel in row_selected:
            for cat in categories:
                if cat in sel and sel[cat] not in union_indices:
                    union_indices.append(sel[cat])
        union_indices.sort()
        
        # Create the top_values matrix: each row gets value if its candidate matches union index, else 0.
        top_values = np.zeros((n_rows, len(union_indices)), dtype=float)
        for i in range(n_rows):
            for j, idx in enumerate(union_indices):
                found = False
                for cat in categories:
                    if cat in row_selected[i] and row_selected[i][cat] == idx:
                        top_values[i, j] = UR_loadcomb_mat[i, idx]
                        found = True
                        break
                if not found:
                    top_values[i, j] = 0.0
        
        top_names = [LoadCombnames_SLS[i] for i in union_indices]
        top_indices = union_indices
        return top_values, top_names, top_indices





















