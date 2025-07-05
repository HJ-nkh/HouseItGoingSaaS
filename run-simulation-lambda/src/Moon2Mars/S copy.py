# -*- coding: utf-8 -*-
"""
Created on Mon Apr 18 16:38:43 2022

@author: Nicolas
"""

import numpy as np
from run_simulation.src.Moon2Mars.EC3 import EC3
from Moon2Mars.EC5 import EC5
from Moon2Mars.EC6 import EC6
from scipy.interpolate import CubicSpline
import copy as copy

class S():
    def __init__(self, model, project):
        
        self.model = model
        self.project = project
        self.member = model.member

        self.typeOfLoads =[]
        self.coor1 = []
        self.coor2 = []
        self.Fxy1 = []
        self.Fxy2 = []
        self.M0 = []
        
        self.loadtype = []

        
    def addLineLoad(self,coor1,coor2,Fxy1,Fxy2,typeOfLoad):
        
        self.coor1.append(coor1)
        self.coor2.append(coor2)
        self.Fxy1.append(Fxy1)
        self.Fxy2.append(Fxy2)
        self.M0.append([np.nan])
        self.typeOfLoads.append(typeOfLoad)
        
        self.loadtype.append('lineload') 
        
    def addPointLoad(self,coor1,Fxy1,typeOfLoad):
        
        self.coor1.append(coor1)
        self.coor2.append([np.nan,np.nan])
        self.Fxy1.append(Fxy1)
        self.Fxy2.append([np.nan,np.nan])
        self.M0.append([np.nan])

        self.typeOfLoads.append(typeOfLoad)
        self.loadtype.append('pointload') 
        
    def addMoment(self,coor1,M0,typeOfLoad):
        self.coor1.append(coor1)
        self.coor2.append([np.nan,np.nan])
        self.Fxy1.append([np.nan,np.nan])
        self.Fxy2.append([np.nan,np.nan])
        self.M0.append(M0)

        self.typeOfLoads.append(typeOfLoad)
        self.loadtype.append('moment')
    
    def run(self):

        typeOfLoads = self.typeOfLoads
        coor1 = self.coor1
        coor2 = self.coor2
        Fxy1 = np.array(self.Fxy1)
        Fxy2 = np.array(self.Fxy2)
        M0 = np.array(self.M0)
        
        
        loadtype = self.loadtype

        row = len(typeOfLoads)
        self.numOfLoads = row
        
        self.konsekvensklasse = self.project.CC
        self.n = self.project.nLevelsAbove #antal etager over belastet konstruktion
        self.addSelfweight = self.project.selfweightOnOff
        
        if self.konsekvensklasse == 'CC1':
            self.KFi = 0.9
        elif self.konsekvensklasse == 'CC2':
            self.KFi = 1.0
        elif self.konsekvensklasse == 'CC3':
            self.KFi = 1.1
            
#####################################################################################################################                   
        psi_0 = 0.5
        psi_1 = 0.3
        psi_2 = 0.2
        gamma_Gjsup = 1
        gamma_Gjinf = 0.9
        gamma_Q1 = 1.5
        psi_0_sne_vind = 0.3
        alpha_n = (1+(self.n-1)*psi_0)/self.n
        
        self.loadCombinations = {}
        self.loadCombinationsFE = {}
        self.loadCombinationsFE_discr = {}
        
        F1 = {}
        F2 = {}
        M = {}
        R0 = {}
        Ve = {}

        F1discr = {}
        F2discr = {}
        Mdiscr = {}
        R0discr = {}
        Vediscr = {}
        
        print('Brudgrænsetilstande: \n')
        loadCombList = ['Nyttelast dominerende', 'Snelast dominerende', 'Vindlast dominerende', 'Kun nyttelaster', 'Egenlast dominerende', 'Brand nyttelast', 'Brand snelast', 'Brand vindlast','Brand egenlast', 'Karakteristisk', 'Hyppig', 'Kvasi-permanent']
        for dom in loadCombList:
            
            self.dom = dom
            self.model.bL = np.empty((0,2), float)
            self.model.bL_el_map = np.empty((0,2), float)
            self.model.localLoads = np.zeros((np.size(self.model.T,0),6), float)
            
            if dom == 'Nyttelast dominerende': 
                
                if self.addSelfweight:       
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                    
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Gjsup
                        M0_temp = M0[i]*self.KFi*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*alpha_n
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*alpha_n
                        M0_temp = M0[i]*self.KFi*gamma_Q1*alpha_n                     
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        M0_temp = M0[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        M0_temp = M0[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                 
                print(dom + ':')
                self.model.run()            
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                
                print('\n')          
                        
            elif dom == 'Snelast dominerende':
                
                if self.addSelfweight:       
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Gjsup
                        M0_temp = M0[i]*self.KFi*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*psi_0
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*psi_0 
                        M0_temp = M0[i]*self.KFi*gamma_Q1*psi_0                  
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1
                        M0_temp = M0[i]*self.KFi*gamma_Q1
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        M0_temp = M0[i]*self.KFi*gamma_Q1*psi_0_sne_vind
                        
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                                         
                print(dom + ':')
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n')        
                        
            elif dom == 'Vindlast dominerende':
                
                if self.addSelfweight:       
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Gjsup
                        M0_temp = M0[i]*self.KFi*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*psi_0
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*psi_0
                        M0_temp = M0[i]*self.KFi*gamma_Q1*psi_0                   
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1
                        Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1
                        M0_temp = M0[i]*self.KFi*gamma_Q1
                
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                
                print(dom + ':')            
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n')                             
                        
            elif dom == 'Kun nyttelaster':
                nytte = []
                c=0
                for ii in range(row):
                    if 'Nyttelast' in typeOfLoads[ii]:
                        nytte = np.append(nytte, typeOfLoads[ii][-2:])
                        
                nytte = list(set(nytte))
                for ii in nytte:
                    
                    self.model.bL = np.empty((0,2), float)
                    self.model.bL_el_map = np.empty((0,2), float)
                    self.model.localLoads = np.zeros((np.size(self.model.T,0),6), float)
                    
                    if self.addSelfweight:     
                        self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                    
                    for i in range(row):
                        if typeOfLoads[i] == 'Standard':
                            Fxy1_temp = Fxy1[i]
                            Fxy2_temp = Fxy2[i]
                            M0_temp = M0[i]
                        elif typeOfLoads[i] == 'Egenlast':
                            Fxy1_temp = Fxy1[i]*self.KFi*gamma_Gjsup
                            Fxy2_temp = Fxy2[i]*self.KFi*gamma_Gjsup
                            M0_temp = M0[i]*self.KFi*gamma_Gjsup
                        elif 'Nyttelast' in typeOfLoads[i]:
                            if typeOfLoads[i] == 'Nyttelast' + ii:
                                Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*alpha_n
                                Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*alpha_n
                                M0_temp = M0[i]*self.KFi*gamma_Q1*alpha_n 
                            else:
                                Fxy1_temp = Fxy1[i]*self.KFi*gamma_Q1*psi_0
                                Fxy2_temp = Fxy2[i]*self.KFi*gamma_Q1*psi_0
                                M0_temp = M0[i]*self.KFi*gamma_Q1*psi_0                        
                        elif typeOfLoads[i] == 'Snelast':
                            Fxy1_temp = Fxy1[i]*0
                            Fxy2_temp = Fxy2[i]*0
                            M0_temp = M0[i]*0
                        elif typeOfLoads[i] == 'Vindlast':
                            Fxy1_temp = Fxy1[i]*0
                            Fxy2_temp = Fxy2[i]*0
                            M0_temp = M0[i]*0
                            
                        if loadtype[i] == 'pointload':
                            if Fxy1_temp[0] != 0:
                                self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                            if Fxy1_temp[1] != 0:   
                                self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                        elif loadtype[i] == 'lineload':
                            if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                            if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                        elif loadtype[i] == 'moment':
                            if M0_temp[0] != 0:
                                self.model.addLoad(coor1[i], "M", M0_temp[0])
                    c +=1
                    dom1 = dom + ' ' + str(int(c))
                    print(dom1 + ':')                
                    self.model.run()
                    
                    F1[dom] = self.model.F1
                    F2[dom] = self.model.F2
                    M[dom] = self.model.M
                    R0[dom] = self.model.R0
                    Ve[dom] = self.model.Ve
                    
                    print('\n')
                    
            elif dom == 'Egenlast dominerende':
                
                if self.addSelfweight:       
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*self.KFi*1.2
                        Fxy2_temp = Fxy2[i]*self.KFi*1.2
                        M0_temp = M0[i]*self.KFi*1.2
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0        
                        M0_temp = M0[i]*0       
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                
                print(dom + ':')            
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n')         
                    
            elif dom == 'Brand nyttelast':
                
                if self.addSelfweight:      
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*gamma_Gjsup
                        M0_temp = M0[i]*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*0.3
                        Fxy2_temp = Fxy2[i]*0.3
                        M0_temp = M0[i]*0.3                   
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                
                print(dom + ':')            
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n')
                
            elif dom == 'Brand snelast':
                
                if self.addSelfweight:     
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*gamma_Gjsup
                        M0_temp = M0[i]*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*0.2
                        Fxy2_temp = Fxy2[i]*0.2
                        M0_temp = M0[i]*0.2                   
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*0.2
                        Fxy2_temp = Fxy2[i]*0.2
                        M0_temp = M0[i]*0.2
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                        
                
                print(dom + ':')            
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n')
                
            elif dom == 'Brand vindlast':
                
                if self.addSelfweight:      
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*gamma_Gjsup
                        M0_temp = M0[i]*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*0.2
                        Fxy2_temp = Fxy2[i]*0.2
                        M0_temp = M0[i]*0.2                   
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*0.2
                        Fxy2_temp = Fxy2[i]*0.2
                        M0_temp = M0[i]*0
                
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                
                print(dom + ':')            
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n') 
                
            elif dom == 'Brand egenlast':
                
                if self.addSelfweight:     
                    self.model.addSelfWeight(self.KFi*gamma_Gjsup)
                
                for i in range(row):
                    if typeOfLoads[i] == 'Standard':
                        Fxy1_temp = Fxy1[i]
                        Fxy2_temp = Fxy2[i]
                        M0_temp = M0[i]
                    elif typeOfLoads[i] == 'Egenlast':
                        Fxy1_temp = Fxy1[i]*gamma_Gjsup
                        Fxy2_temp = Fxy2[i]*gamma_Gjsup
                        M0_temp = M0[i]*gamma_Gjsup
                    elif 'Nyttelast' in typeOfLoads[i]:
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0      
                        M0_temp = M0[i]*0             
                    elif typeOfLoads[i] == 'Snelast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                    elif typeOfLoads[i] == 'Vindlast':
                        Fxy1_temp = Fxy1[i]*0
                        Fxy2_temp = Fxy2[i]*0
                        M0_temp = M0[i]*0
                
                    if loadtype[i] == 'pointload':
                        if Fxy1_temp[0] != 0:
                            self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                        if Fxy1_temp[1] != 0:   
                            self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                    elif loadtype[i] == 'lineload':
                        if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                        if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                            self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                    elif loadtype[i] == 'moment':
                        if M0_temp[0] != 0:
                            self.model.addLoad(coor1[i], "M", M0_temp[0])
                
                print(dom + ':')            
                self.model.run()
                
                F1[dom] = self.model.F1
                F2[dom] = self.model.F2
                M[dom] = self.model.M
                R0[dom] = self.model.R0
                Ve[dom] = self.model.Ve
                
                print('\n')             
                    
            elif dom == 'Karakteristisk':
                print('Anvendelsesgrænsetilstande: \n')       
                domComb = []
                c=0
                for ii in range(row):
                    if 'Nyttelast' in typeOfLoads[ii]:
                        domComb = np.append(domComb, 'Nyttelast' + typeOfLoads[ii][-2:])
                
                domComb = np.append(domComb, 'Snelast')
                domComb = np.append(domComb, 'Vindlast')
                domComb = np.append(domComb, 'Egenlast alene')
                domComb = np.append(domComb, 'Nyttelast alene')
                domComb = np.append(domComb, 'Snelast alene')
                domComb = np.append(domComb, 'Vindlast alene')
                domComb = list(set(domComb))
                for domin in domComb:
                    
                    self.model.bL = np.empty((0,2), float)
                    self.model.bL_el_map = np.empty((0,2), float)
                    self.model.localLoads = np.zeros((np.size(self.model.T,0),6), float)
                    
                    if self.addSelfweight and not (('Nyttelast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin)):       
                        self.model.addSelfWeight(gamma_Gjsup)                   
                        
                    
                    for i in range(row):                           
                        if typeOfLoads[i] == 'Standard':
                            Fxy1_temp = Fxy1[i]
                            Fxy2_temp = Fxy2[i]
                            M0_temp = M0[i]
                        elif typeOfLoads[i] == 'Egenlast':
                            if ('Nyttelast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            else:
                                Fxy1_temp = Fxy1[i]*gamma_Gjsup
                                Fxy2_temp = Fxy2[i]*gamma_Gjsup
                                M0_temp = M0[i]*gamma_Gjsup
                        elif 'Nyttelast' in typeOfLoads[i]:
                            if ('Egenlast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            elif (typeOfLoads[i] == domin) or ('Nyttelast alene' == domin):
                                Fxy1_temp = Fxy1[i]
                                Fxy2_temp = Fxy2[i]
                                M0_temp = M0[i]
                            else:
                                Fxy1_temp = Fxy1[i]*psi_0
                                Fxy2_temp = Fxy2[i]*psi_0
                                M0_temp = M0[i]*psi_0                            
                        elif typeOfLoads[i] == 'Snelast':
                            if ('Egenlast alene' in domin) or ('Nyttelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            elif 'Snelast' in domin:
                                Fxy1_temp = Fxy1[i]
                                Fxy2_temp = Fxy2[i]
                                M0_temp = M0[i]
                            else:
                                Fxy1_temp = Fxy1[i]*0.3
                                Fxy2_temp = Fxy2[i]*0.3
                                M0_temp = M0[i]*0.3
                        elif typeOfLoads[i] == 'Vindlast':
                            if ('Egenlast alene' in domin) or ('Nyttelast alene' in domin) or ('Snelast alene' in domin):
                                continue
                            elif 'Vindlast' in domin:
                                Fxy1_temp = Fxy1[i]
                                Fxy2_temp = Fxy2[i]
                                M0_temp = M0[i]
                            else:
                                Fxy1_temp = Fxy1[i]*0.3
                                Fxy2_temp = Fxy2[i]*0.3
                                M0_temp = M0[i]*0.3
                            
                        if loadtype[i] == 'pointload':
                            if Fxy1_temp[0] != 0:
                                self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                            if Fxy1_temp[1] != 0:   
                                self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                        elif loadtype[i] == 'lineload':
                            if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                            if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                        elif loadtype[i] == 'moment':
                            if M0_temp[0] != 0:
                                self.model.addLoad(coor1[i], "M", M0_temp[0])

                    c+=1
                    if 'alene' in domin:
                        dom1 = dom + ' - ' + domin
                    else:    
                        dom1 = dom + ' - ' + domin + ' dominerende'
                    print(dom1 + ':')                
                    self.model.run()
                    
                    F1[dom1] = self.model.F1
                    F2[dom1] = self.model.F2
                    M[dom1] = self.model.M
                    R0[dom1] = self.model.R0
                    Ve[dom1] = self.model.Ve
                    
                    print('\n')
                    
            elif dom == 'Hyppig':
                domComb = []
                c=0
                for ii in range(row):
                    if 'Nyttelast' in typeOfLoads[ii]:
                        domComb = np.append(domComb, 'Nyttelast' + typeOfLoads[ii][-2:])
                
                domComb = np.append(domComb, 'Snelast')
                domComb = np.append(domComb, 'Vindlast')
                domComb = np.append(domComb, 'Egenlast alene')
                domComb = np.append(domComb, 'Nyttelast alene')
                domComb = np.append(domComb, 'Snelast alene')
                domComb = np.append(domComb, 'Vindlast alene')
                domComb = list(set(domComb))
                for domin in domComb:
                    
                    self.model.bL = np.empty((0,2), float)
                    self.model.bL_el_map = np.empty((0,2), float)
                    self.model.localLoads = np.zeros((np.size(self.model.T,0),6), float)
                    
                    if self.addSelfweight and not (('Nyttelast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin)):         
                        self.model.addSelfWeight(gamma_Gjsup)
                
                    
                    for i in range(row):
                        if typeOfLoads[i] == 'Standard':
                            Fxy1_temp = Fxy1[i]
                            Fxy2_temp = Fxy2[i]
                            M0_temp = M0[i]
                        elif typeOfLoads[i] == 'Egenlast':
                            if ('Nyttelast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            else:
                                Fxy1_temp = Fxy1[i]*gamma_Gjsup
                                Fxy2_temp = Fxy2[i]*gamma_Gjsup
                                M0_temp = M0[i]*gamma_Gjsup
                        elif 'Nyttelast' in typeOfLoads[i]:
                            if ('Egenlast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            elif (typeOfLoads[i] == domin) or ('Nyttelast alene' == domin):
                                Fxy1_temp = Fxy1[i]*psi_1
                                Fxy2_temp = Fxy2[i]*psi_1
                                M0_temp = M0[i]*psi_1                            
                            else:
                                Fxy1_temp = Fxy1[i]*psi_2
                                Fxy2_temp = Fxy2[i]*psi_2
                                M0_temp = M0[i]*psi_2                            
                        elif typeOfLoads[i] == 'Snelast':
                            if ('Egenlast alene' in domin) or ('Nyttelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            elif 'Snelast' in domin:
                                Fxy1_temp = Fxy1[i]*0.2
                                Fxy2_temp = Fxy2[i]*0.2
                                M0_temp = M0[i]*0.2                             
                            else:
                                Fxy1_temp = Fxy1[i]*0
                                Fxy2_temp = Fxy2[i]*0
                                M0_temp = M0[i]*0
                        elif typeOfLoads[i] == 'Vindlast':
                            if ('Egenlast alene' in domin) or ('Nyttelast alene' in domin) or ('Snelast alene' in domin):
                                continue
                            elif 'Vindlast' in domin:
                                Fxy1_temp = Fxy1[i]*0.2
                                Fxy2_temp = Fxy2[i]*0.2
                                M0_temp = M0[i]*0.2
                            else:
                                Fxy1_temp = Fxy1[i]*0
                                Fxy2_temp = Fxy2[i]*0
                                M0_temp = M0[i]*0
                            
                        if loadtype[i] == 'pointload':
                            if Fxy1_temp[0] != 0:
                                self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                            if Fxy1_temp[1] != 0:   
                                self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                        elif loadtype[i] == 'lineload':
                            if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                            if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                        elif loadtype[i] == 'moment':
                            if M0_temp[0] != 0:
                                self.model.addLoad(coor1[i], "M", M0_temp[0])
                    c+=1
                    if 'alene' in domin:
                        dom1 = dom + ' - ' + domin
                    else:    
                        dom1 = dom + ' - ' + domin + ' dominerende'
                    print(dom1 + ':')                
                    self.model.run()
                    
                    F1[dom1] = self.model.F1
                    F2[dom1] = self.model.F2
                    M[dom1] = self.model.M
                    R0[dom1] = self.model.R0
                    Ve[dom1] = self.model.Ve
                    
                    print('\n')     
                    
            elif dom == 'Kvasi-permanent':
                domComb = []
                c=0
                for ii in range(row):
                    if 'Nyttelast' in typeOfLoads[ii]:
                        domComb = np.append(domComb, 'Nyttelast' + typeOfLoads[ii][-2:])
                
                domComb = np.append(domComb, 'Snelast')
                domComb = np.append(domComb, 'Vindlast')
                domComb = np.append(domComb, 'Egenlast alene')
                domComb = np.append(domComb, 'Nyttelast alene')
                domComb = np.append(domComb, 'Snelast alene')
                domComb = np.append(domComb, 'Vindlast alene')
                domComb = list(set(domComb))
                for domin in domComb:
                    
                    self.model.bL = np.empty((0,2), float)
                    self.model.bL_el_map = np.empty((0,2), float)
                    self.model.localLoads = np.zeros((np.size(self.model.T,0),6), float)
                    
                    if self.addSelfweight and not (('Nyttelast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin)):         
                        self.model.addSelfWeight(gamma_Gjsup)

                    
                    for i in range(row):
                        if typeOfLoads[i] == 'Standard':
                            Fxy1_temp = Fxy1[i]
                            Fxy2_temp = Fxy2[i]
                            M0_temp = M0[i]
                        elif typeOfLoads[i] == 'Egenlast':
                            if ('Nyttelast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            else:
                                Fxy1_temp = Fxy1[i]*gamma_Gjsup
                                Fxy2_temp = Fxy2[i]*gamma_Gjsup
                                M0_temp = M0[i]*gamma_Gjsup
                        elif 'Nyttelast' in typeOfLoads[i]:
                            if ('Egenlast alene' in domin) or ('Snelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            elif (typeOfLoads[i] == domin) or ('Nyttelast alene' == domin):
                                Fxy1_temp = Fxy1[i]*psi_2
                                Fxy2_temp = Fxy2[i]*psi_2
                                M0_temp = M0[i]*psi_2                                
                            else:
                                Fxy1_temp = Fxy1[i]*psi_2
                                Fxy2_temp = Fxy2[i]*psi_2
                                M0_temp = M0[i]*psi_2                            
                        elif typeOfLoads[i] == 'Snelast':
                            if ('Egenlast alene' in domin) or ('Nyttelast alene' in domin) or ('Vindlast alene' in domin):
                                continue
                            elif 'Snelast' in domin:
                                Fxy1_temp = Fxy1[i]*0
                                Fxy2_temp = Fxy2[i]*0
                                M0_temp = M0[i]*0                                 
                            else:
                                Fxy1_temp = Fxy1[i]*0
                                Fxy2_temp = Fxy2[i]*0
                                M0_temp = M0[i]*0
                        elif typeOfLoads[i] == 'Vindlast':
                            if ('Egenlast alene' in domin) or ('Nyttelast alene' in domin) or ('Snelast alene' in domin):
                                continue
                            elif 'Vindlast' in domin:
                                Fxy1_temp = Fxy1[i]*0
                                Fxy2_temp = Fxy2[i]*0
                                M0_temp = M0[i]*0                                 
                            else:
                                Fxy1_temp = Fxy1[i]*0
                                Fxy2_temp = Fxy2[i]*0
                                M0_temp = M0[i]*0
                            
                        if loadtype[i] == 'pointload':
                            if Fxy1_temp[0] != 0:
                                self.model.addLoad(coor1[i], "Fx", Fxy1_temp[0])
                            if Fxy1_temp[1] != 0:   
                                self.model.addLoad(coor1[i], "Fy", Fxy1_temp[1])
                        elif loadtype[i] == 'lineload':
                            if Fxy1_temp[0] != 0 or Fxy2_temp[0] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fx",Fxy1_temp[0],Fxy2_temp[0])
                            if Fxy1_temp[1] != 0 or Fxy2_temp[1] != 0:
                                self.model.addLineLoad(coor1[i],coor2[i],"Fy",Fxy1_temp[1],Fxy2_temp[1])
                        elif loadtype[i] == 'moment':
                            if M0_temp[0] != 0:
                                self.model.addLoad(coor1[i], "M", M0_temp[0])
                    
                    c+=1
                    if 'alene' in domin:
                        dom1 = dom + ' - ' + domin
                    else:    
                        dom1 = dom + ' - ' + domin + ' dominerende'
                    print(dom1 + ':')                
                    self.model.run()
                    
                    F1[dom1] = self.model.F1
                    F2[dom1] = self.model.F2
                    M[dom1] = self.model.M
                    R0[dom1] = self.model.R0
                    Ve[dom1] = self.model.Ve
                    
                    print('\n')
                    
        self.loadCombinationsFE['F1'] = F1
        self.loadCombinationsFE['F2'] = F2
        self.loadCombinationsFE['M'] = M
        self.loadCombinationsFE['R0'] = R0
        self.loadCombinationsFE['Ve'] = Ve

        loadCombList = F1.keys()

        # --------- Discretize section forces for each load case --------- #
        # Initialize dictionaries with an empty array for each load case
        F1discr = {lc: np.array([]) for lc in loadCombList}
        F2discr = {lc: np.array([]) for lc in loadCombList}
        Mdiscr = {lc: np.array([]) for lc in loadCombList}
        Vediscr = {lc: np.empty((0, 2)) for lc in loadCombList}
        XFs = np.empty((2,0), float)
        T_discr = np.empty([0,2])
        X_discr = np.empty([0,2])
        X_loc_discr = np.array([])
        member_discr = []
        n=-1
        self.plotDiscr = 10

        for i, m in enumerate(self.member):
            for lc in F1:
                _, F1temp, _, _ = self.discretizeSectionForces(m, 'F1', lc)
                F1discr[lc] = np.append(F1discr[lc], F1temp, axis=0)

                _, F2temp, _, _ = self.discretizeSectionForces(m, 'F2', lc)
                F2discr[lc] = np.append(F2discr[lc], F2temp, axis=0)

                _, Mtemp, _, _ = self.discretizeSectionForces(m, 'M', lc)
                Mdiscr[lc] = np.append(Mdiscr[lc], Mtemp, axis=0)

                Vetemp = self.getDeformation(m, lc)
                Vediscr[lc] = np.append(Vediscr[lc], Vetemp, axis=0)


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
            #self.T_discr = np.append(self.T_discr, m.T, axis=0)
            #self.X_discr = np.append(self.X_discr, m.X, axis=0)
            #self.consistOfelements_discr = np.append(self.consistOfelements_discr, m.consistOfelements, axis=0)
            
        self.loadCombinationsFE_discr['F1'] = F1discr
        self.loadCombinationsFE_discr['F2'] = F2discr
        self.loadCombinationsFE_discr['M'] = Mdiscr
        self.loadCombinationsFE_discr['R0'] = R0discr
        self.loadCombinationsFE_discr['Ve'] = Vediscr
        self.T_discr = T_discr.astype(int)
        self.X_discr = X_discr
        self.X_loc_discr = X_loc_discr
        self.member_discr = member_discr

        # --------- Calculate utilization ratios --------- #
        for comb in F1discr:
            if 'Karakteristisk' in comb or 'Hyppig' in comb or 'Kvasi-permanent' in comb:
                self.loadCombinations[comb] = self.getURvalues(comb, 'SLS')
            else:
                self.loadCombinations[comb] = self.getURvalues(comb, 'ULS')

       #______________________________________________________________________________________________________________________#
        self.sectionResults = []
        for i in range(len(self.loadCombinations['Nyttelast dominerende'])):
            section = {}
            loadCombUR_ULS = {}
            loadCombUR_SLS = {}
            loadCombUR_ALS = {}
            URnames_ULS = []
            URnames_SLS = []
            URnames_ALS = []
            LoadCombnames_SLS = []
            LoadCombnames_ULS = []
            LoadCombnames_ALS = []
            for combination in self.loadCombinations:
                b = self.loadCombinations[combination][i]
                URs_SLS = {}
                URs_ULS = {}
                URs_ALS = {}
                for variabel in dir(b):
                    if 'UR_def' in variabel: #SLS
                        URs_SLS[variabel] = vars(b)[variabel]
                        LoadCombnames_SLS.append(combination)
                        URnames_SLS.append(variabel)
                    elif 'UR' in variabel and not 'Brand' in combination: #ULS
                        URs_ULS[variabel] = vars(b)[variabel]
                        LoadCombnames_ULS.append(combination)
                        URnames_ULS.append(variabel)
                    elif 'UR' in variabel and 'Brand' in combination: #ALS
                        URs_ALS[variabel] = vars(b)[variabel]
                        LoadCombnames_ALS.append(combination)
                        URnames_ALS.append(variabel)
                       
                loadCombUR_ULS[combination] = URs_ULS
                loadCombUR_SLS[combination] = URs_SLS
                loadCombUR_ALS[combination] = URs_ALS
            
            URnames_SLS = list(dict.fromkeys(URnames_SLS))
            URnames_ULS = list(dict.fromkeys(URnames_ULS))
            URnames_ALS = list(dict.fromkeys(URnames_ALS))
            LoadCombnames_SLS = list(dict.fromkeys(LoadCombnames_SLS))
            LoadCombnames_ULS = list(dict.fromkeys(LoadCombnames_ULS))
            LoadCombnames_ALS = list(dict.fromkeys(LoadCombnames_ALS))
           
            UR_loadcomb_mat_SLS = np.zeros([len(URnames_SLS),len(LoadCombnames_SLS)])
            UR_loadcomb_mat_ULS = np.zeros([len(URnames_ULS),len(LoadCombnames_ULS)])
            UR_loadcomb_mat_ALS = np.zeros([len(URnames_ALS),len(LoadCombnames_ALS)])
            
            for ii in range(np.size(UR_loadcomb_mat_SLS,0)):
                for iii in range(np.size(UR_loadcomb_mat_SLS,1)):
                    UR_loadcomb_mat_SLS[ii,iii] = loadCombUR_SLS[LoadCombnames_SLS[iii]][URnames_SLS[ii]]
            
            for ii in range(np.size(UR_loadcomb_mat_ULS,0)):
                for iii in range(np.size(UR_loadcomb_mat_ULS,1)):
                    UR_loadcomb_mat_ULS[ii,iii] = loadCombUR_ULS[LoadCombnames_ULS[iii]][URnames_ULS[ii]]
                    
            for ii in range(np.size(UR_loadcomb_mat_ALS,0)):
                for iii in range(np.size(UR_loadcomb_mat_ALS,1)):
                    UR_loadcomb_mat_ALS[ii,iii] = loadCombUR_ALS[LoadCombnames_ALS[iii]][URnames_ALS[ii]]
            
            if not UR_loadcomb_mat_SLS.size==0:
                maxArg_SLS = np.argmax(UR_loadcomb_mat_SLS,1)
            if not UR_loadcomb_mat_ULS.size==0:
                maxArg_ULS = np.argmax(UR_loadcomb_mat_ULS,1)
            if not UR_loadcomb_mat_ALS.size==0:
                maxArg_ALS = np.argmax(UR_loadcomb_mat_ALS,1)
            
            UR_CriticalLoadComb = {}
            if not UR_loadcomb_mat_SLS.size==0:
                for ii in range(len(maxArg_SLS)):
                    UR_CriticalLoadComb[URnames_SLS[ii]] = LoadCombnames_SLS[maxArg_SLS[ii]]
            if not UR_loadcomb_mat_ULS.size==0:
                for ii in range(len(maxArg_ULS)):
                    UR_CriticalLoadComb[URnames_ULS[ii]] = LoadCombnames_ULS[maxArg_ULS[ii]]
            if not UR_loadcomb_mat_ALS.size==0:
                for ii in range(len(maxArg_ALS)):
                    UR_CriticalLoadComb[URnames_ALS[ii] + '_brand'] = LoadCombnames_ALS[maxArg_ALS[ii]]
            
            
            section['UR_CriticalLoadComb'] = UR_CriticalLoadComb
            
            section['URnames_SLS'] = URnames_SLS
            section['LoadCombnames_SLS'] = LoadCombnames_SLS
            section['UR_loadcomb_mat_SLS'] = UR_loadcomb_mat_SLS
            
            section['URnames_ULS'] = URnames_ULS
            section['LoadCombnames_ULS'] = LoadCombnames_ULS
            section['UR_loadcomb_mat_ULS'] = UR_loadcomb_mat_ULS
            
            section['URnames_ALS'] = URnames_ALS
            section['LoadCombnames_ALS'] = LoadCombnames_ALS
            section['UR_loadcomb_mat_ALS'] = UR_loadcomb_mat_ALS
            
            self.sectionResults.append(section)
            
     
                   
##########################################################################################################################   

    def getURvalues(self, lc, typeOfState):          
        bjaelke = list()
        for i in range(len(self.member_discr)):
            member = self.member_discr[i]
            memberprop = member['memberprop']
            
            if member['membertype'] == 'Stål': # Stål
                
                ec3 = EC3(self, member, lc)        
                
                if 'RH' not in memberprop['profile']:     
                    if typeOfState == 'ULS':
                        ec3.boejningsmoment625()   
                        ec3.forskydning626()
                        ec3.trykpaavirkedeElementerMedKonstantTvaersnit631()
                        ec3.kipning632()
                        ec3.lokaleTvaergaaendeKraefter617()
                    elif typeOfState == 'SLS':
                        ec3.deformation()
                        
                    bjaelke.append(ec3)
                else:
                    if typeOfState == 'ULS':
                        ec3.boejningsmoment625()   
                        ec3.forskydning626()
                        ec3.trykpaavirkedeElementerMedKonstantTvaersnit631()
                        ec3.kipning632()

                    bjaelke.append(ec3)

  
            elif member['membertype'] == 'Træ': #Træ
 
                ec5 = EC5(self, member, lc)
                
                if typeOfState == 'ULS':
                    ec5.boejning616(1)
                    ec5.forskydning617()
                    ec5.trykVinkelretPaaFibrene615()
                    ec5.trykParalleltMedFibrene614(1)
                    ec5.traekParalleltMedFibrene612(1)
                    ec5.boejningOgTryk624()
                    ec5.boejningOgTraek623()
                elif typeOfState == 'SLS':
                    ec5.deformation()

                bjaelke.append(ec5)
                
            elif member['membertype'] == 'Murværk': # Murværk        
                
                ec6 = EC6(self.model, member, self.project)
                
                if typeOfState == 'ULS':
                    ec6.getParameterStandardMurvaerk()
                    ec6.excentricitetRitter()      
                    ec6.addPlate()
                    ec6.koncentreretLastRitter()
                    ec6.koncentreretLast()
                
                bjaelke.append(ec6)
        
        return  bjaelke
    
    
            
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
        defArray = np.empty((0, 2))

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
                Us = np.zeros((2, nrp))  # Displacement storage
                for i in range(nrp):
                    s = i / (nrp - 1)

                    N = [[1-s, 0, 0, s, 0, 0],
                        [0, 1 - 3 * s**2 + 2 * s**3, (s-2*s**2+s**3)*L, 0, 3*s**2-2*s**3, (-s**2+s**3)*L]]
                    
                    scale = 40
                    
                    Us[:,i] = np.dot(np.transpose(Au),np.dot(N,v)) # Displacement storage
                    Xx[:,i] = np.transpose(X[int(T[el,0]),:])*(1-s) + np.transpose(X[int(T[el,1]),:])*s # positions along the beam for plotting
                    Xs[:,i] = Xx[:,i] + scale*Us[:,i] #position and displacement

                if k == 0:
                    defArray_temp = np.transpose(Us)
                else:
                    defArray_temp = np.append(defArray_temp, np.transpose(Us[:,1:]), axis=0)

            defArray = np.append(defArray, defArray_temp, axis=0)

        return defArray

            
            
        
        
        
        
        
        
        
        
        
        
            
            
            
        
            
            
        