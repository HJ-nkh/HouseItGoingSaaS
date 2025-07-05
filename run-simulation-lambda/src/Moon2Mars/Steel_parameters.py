9# -*- coding: utf-8 -*-
"""
Created on Sat Feb 26 08:02:45 2022

@author: danie
"""

import pandas as pd

class SteelProp:

    def __init__(self):
        # Partial factors for resistance, gamma_m
        steel_partial_factors_dataset = {
            'Partial coefficient': ['gamma_M0', 'gamma_M1','gamma_M1_shell','gamma_M2','gamma_M3','gamma_M3_SLS', 'gamma_M4', 'gamma_M5','gamma_M7'],
            'Application': ['Elastic/plastic stresses of brutto cross section', 'Stability: column, buckling, critical bearing capacity and shells', 'Shells with britle failure', 'Connections', 'Friction connections','Friction connections in SLS','Injection bolts', 'Welded pipe knots','Pretensioned bolts'],
            'Value': [1.1, 1.2, 1.32, 1.35, 1.35, 1.20, 1.1, 1.35, 1.20]}
        self.steel_partial_factors = pd.DataFrame(steel_partial_factors_dataset)
        self.steel_partial_factors.set_index('Partial coefficient', inplace = True)
        
        
        # Steel properties
        steel_properties_dataset = {
            'Property': ['Modulus of elasticity, E [MPa]', 'Shear modulus, G [MPa]','Poissons ratio, Nu [-]','Density, rho [kg/m^3]','Expansion coefficient, alpha [K^-1]', 'Heat density, c [kJ/(kg*K)'],
            'Value': [210000, 81000, 0.3, 7850, 12*10**(-6), 0.48]}
        self.steel_properties = pd.DataFrame(steel_properties_dataset)
        self.steel_properties.set_index('Property', inplace = True)
        
        #Steel strength according to
        #EN10025-2:2004 (E)
        #EN10025-3:2004 (E)
        steel_yield_strength_dataset = {
            'Grade': ['S235', 'S275','S355','S420','S460','S550','S530'],
            't<=16': [235, 275, 355, 420, 460, 550, '-'],
            '16<t<=40': [225, 265, 345, 400, 440, 550, '-'],
            '40<t<=63': [215, 255, 335, 390, 410, '-', 550],
            '63<t<=80': [215, 245, 325, 390, 410, '-', 530],
            '80<t<=100': [215, 235, 315, '-', 400, '-', 530],
            '100<t<=150': [195, 225, 295, '-', 380, '-', 490],
            '150<t<=200': [185, 215, 285, '-', 370, '-', '-'],
            '200<t<=250': [175, 205, 275, '-', '-', '-', '-'],
            '250<t<=400': [165, 195, 265, '-', '-', '-', '-']}
        self.steel_yield_strength = pd.DataFrame(steel_yield_strength_dataset)
        self.steel_yield_strength.set_index('Grade', inplace = True)
             
        steel_tensile_strength_dataset = {
            'Grade': ['S235', 'S275','S355','S420','S460','S550','S530'],
            't<=3': [360, 430, 510, 520, 540, 640, 640],
            '3<t<=100': [360, 410, 470, 520, 540, 640, 640],
            '100<t<=150': [350, 400, 450, 500, 530, 590, 590],
            '150<t<=250': [340, 380, 450, '-', '-', '-', '-'],
            '250<t<=400': [330, 380, 450, '-', '-', '-', '-'],}
        self.steel_tensile_strength = pd.DataFrame(steel_tensile_strength_dataset)
        self.steel_tensile_strength.set_index('Grade', inplace = True)
        
        #Bolt dimensions
        bolt_dimensions_dataset = {
            'Description': ['Shaft diameter, d [mm]', 'Shaft diameter, passbolt, d [mm]','Stress area, As [mm^2]','Shaft area, Ash [mm^2]', 'Shaft area pass bolt, [mm^2]','Key width, [mm]','Washer diameter, [mm]'],
            'M12': [12, 13, 84.3, 113, 133, 19, 24],
            'M14': [14, 15, 115, 154, 177, 22, 28],
            'M16': [16, 17, 157, 201, 227, 24, 30],
            'M20': [20, 21, 245, 314, 346, 30, 37],
            'M22': [22, 23, 303, 380, 415, 32, 39],
            'M24': [24, 25, 353, 452, 491, 36, 44],
            'M27': [27, 28, 459, 573, 616, 41, 50],
            'M30': [30, 31, 561, 707, 755, 46, 56],
            'M36': [36, 37, 817, 1018, 1075, 55, 66]}
        self.bolt_dimensions = pd.DataFrame(bolt_dimensions_dataset)
        self.bolt_dimensions.set_index('Description', inplace = True)
        
        #Materiale styrke bolte
        # Angivet i Stålkonstruktioner efter DS/EN 1993-1-1 udgave 2 side 261. Størrelser angivet i MPa.
        bolt_strength_dataset = {
            'Styrkeklasse': ['4.6', '4.8','5.6','5.8', '8.8','10.9'],
            'fub': [400, 400, 500, 500, 800, 1000],
            'fyb': [240, 320, 300, 400, 640, 900]}
        self.bolt_strength = pd.DataFrame(bolt_strength_dataset)
        self.bolt_strength.set_index('Styrkeklasse', inplace = True)
        
        
    def getElasticity(self):
        return self.steel_properties['Value']['Modulus of elasticity, E [MPa]']*10**6
    
    def getShearModulus(self):
        return self.steel_properties['Value']['Shear modulus, G [MPa]']*10**6
    
    def getDensity(self):
        return self.steel_properties['Value']['Density, rho [kg/m^3]']
    
    def getGamma(self, gamma):
        return self.steel_partial_factors['Value'][gamma]
    
    def getYieldStrength(self, grade, t):
        if t <= 0.016:
            return self.steel_yield_strength['t<=16'][grade]*10**6
        elif t <= 0.040:
            return self.steel_yield_strength['16<t<=40'][grade]*10**6
        elif t <= 0.063:
            return self.steel_yield_strength['40<t<=63'][grade]*10**6
        elif t <= 0.080:
            return self.steel_yield_strength['63<t<=80'][grade]*10**6
        elif t <= 0.100:
            return self.steel_yield_strength['80<t<=100'][grade]*10**6
        elif t <= 0.150:
            return self.steel_yield_strength['100<t<=150'][grade]*10**6
        elif t <= 0.200:
            return self.steel_yield_strength['150<t<=200'][grade]*10**6
        elif t <= 0.250:
            return self.steel_yield_strength['200<t<=250'][grade]*10**6
        elif t <= 0.400:
            return self.steel_yield_strength['250<t<=400'][grade]*10**6

    def getUltimateStrength(self, grade,t):
        if t <= 0.003:
            return self.steel_tensile_strength['t<=3'][grade]*10**6
        elif t <= 0.1:
            return self.steel_tensile_strength['3<t<=100'][grade]*10**6
        elif t <= 0.15:
            return self.steel_tensile_strength['100<t<=150'][grade]*10**6
        elif t <= 0.25:
            return self.steel_tensile_strength['150<t<=250'][grade]*10**6
        elif t <= 0.4:
            return self.steel_tensile_strength['250<t<=400'][grade]*10**6
                
    