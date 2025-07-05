# -*- coding: utf-8 -*-
"""
Spyder Editor

This is a temporary script file.
"""
import pandas as pd

class WoodProp:
    # From Structural Timber Design to Eurocode 5
    def __init__(self):

        # Partial factors for material properties and resistance, gamma_m
        # COMMENT: De skal lige kigges ordentligt igennem her, da de ikke stemmer overens med det danske nationale anneks. Jeg har ændret konstruktionstræ til 1,35 og limtræ til 1,3
        wood_partial_factors_dataset = {
            'States/combinations': ['ULS - solid timber, grade stamp individually marked', 'ULS - Solid timber, grade stamp package marked','ULS - Glued-laminated timber','ULS - LVL, plywood and OSB','ULS - Particleboard','ULS - Fibreboards - hard, medium, MDF, soft','ULS - Punched metal plate fasteners Anchorage strength','ULS - Punched metal plate fasteners plate (steel) strength','ULS - Connections - excluding punched metal plate fasteners','ULS accidental - Any material and connection', ' SLS - Any material and connection'],
            'gamma_M': [1.35, 2, 1.3, 1.2, 1.3, 1.3, 1.3, 1.15, 1.3, 1, 1]}
        self.gamma_M = pd.DataFrame(wood_partial_factors_dataset)
        self.gamma_M.set_index("States/combinations", inplace = True)
        
        # Values of k_def at service class 1, 2 or 3
        Deformation_factor_dataset = {
            'Material - standard': ['Solid timber EN 14081-1','Glued-laminated timber EN 14080','LVL EN 14374, EN 14279','Plywood EN 636-1','Plywood EN 636-2','Plywood EN 636-3','OSB EN 300 - type OSB/2','OSB EN 300 - types OSB/3, OSB/4'],
            'Service class 1': [0.6, 0.6, 0.6, 0.8, 0.8, 0.8, 2.25, 1.5],
            'Service class 2': [0.8, 0.8, 0.8, '-', 1, 1, '-', 2.25],
            'Service class 3': [2, 2, 2, '-','-', 2.5, '-', '-']}
        self.k_def = pd.DataFrame(Deformation_factor_dataset)
        self.k_def.set_index("Material - standard", inplace = True)
        
        # Modification factor
        Modification_factor_dataset = {
            'Material - standard': ['Solid timber - EN 14081-1','Glued-laminated timber - EN 14080', 'Laminated veneered lumber (LVL)-BS EN 14374 or EN 14279','PLywood - BS EN 636 Parts: 1, 2 and 3','Plywood - BS EN 636 Parts: 2 and 3','Plywood - BS EN 636 Part: 3','OSB - BS EN 300, Board type OSB/2','OSB - BS EN 300, Board type OSB/3 and/4','OSB - BS EN 300, Board type OSB/3 and/4'],
            'Service class': [1,2,3,1,2,3,1,1,2],
            'Permanent': [0.6, 0.6, 0.5, 0.6, 0.6, 0.5, 0.3, 0.4, 0.3],
            'Long term': [0.7, 0.7, 0.55, 0.7, 0.7, 0.55, 0.45, 0.5, 0.54],
            'Medium term': [0.8, 0.8, 0.65, 0.8, 0.8, 0.65, 0.65, 0.7, 0.55],
            'Short term': [0.9, 0.9, 0.7, 0.9, 0.9, 0.7, 0.85, 0.9, 0.7],
            'Instantaneous': [1.1, 1.1, 0.9, 1.1, 1.1, 0.9, 1.1, 1.1, 0.9]}
        self.k_mod = pd.DataFrame(Modification_factor_dataset)
        self.k_mod.set_index("Material - standard", inplace = True)
        
        # Structural timber
        # CXX is for Soft wood and poplar species and DXX  is for Hardwood species
        Struct_timber_dataset = {
            'strength class': ['Bending strength, f_m,k [MPa]','Tension strength, f_t,0,k [MPa]','Tension strength, f_t,90,g,k [MPa]','Compression strength, f_c,0,k [MPa]','Compression strength, f_c,90,k [MPa]','Shear strength, f_v,k [MPa]','Mean modulus of elasticity, E_0,mean [GPa]','Modulus of elasticity, E_0,05 [GPa]','Mean modulus of elasticity, E_90,mean [GPa]','Mean shear modulus, G_mean [GPa]','Density, rho_k [kg/m^3]','Mean density, rho_mean [kg/m^3]'],
            'C14': [14,  8, 0.4, 16, 2,   3,   7, 4.7, 0.23, 0.44, 290, 350],
            'C16': [16, 10, 0.4, 17, 2.2, 3.2, 8, 5.4, 0.27, 0.5,  310, 370],
            'C18': [18, 11, 0.4, 18, 2.2, 3.4, 9, 6, 0.3, 0.56, 320, 380],
            'C20': [20, 12, 0.4, 19, 2.3, 3.6, 9.5, 6.4, 0.32, 0.59, 330, 390],
            'C22': [22, 13, 0.4, 20, 2.4, 3.8, 10, 6.7, 0.33, 0.63, 340, 410],
            'C24': [24, 14, 0.4, 21, 2.5, 4, 11, 7.4, 0.37, 0.69, 350, 420],
            'C27': [27, 16, 0.4, 22, 2.6, 4, 11.5, 7.7, 0.38, 0.72, 370, 450],
            'C30': [30, 18, 0.4, 23, 2.7, 4, 12, 8, 0.4, 0.75, 380, 460],
            'C35': [35, 21, 0.4, 25, 2.8, 4, 13, 8.7, 0.43, 0.81, 400, 480],
            'C40': [40, 24, 0.4, 26, 2.9, 4, 14, 9.4, 0.47, 0.88, 420, 500],
            'C45': [45, 27, 0.4, 27, 3.1, 4, 15, 10, 0.5, 0.94, 440, 520],
            'C50': [50, 30, 0.4, 29, 3.2, 4, 16, 10.7, 0.53, 1, 460, 550],
            'D18': [18, 11, 0.6, 18, 7.5, 3.4, 9.5, 8, 0.63, 0.59, 475, 570],
            'D24': [24, 14, 0.6, 21, 7.8, 4, 10, 8.5, 0.67, 0.62, 485, 580],
            'D30': [30, 18, 0.6, 23, 8, 4, 11, 9.2, 0.73, 0.69, 530, 640],
            'D35': [35, 21, 0.6, 25, 8.1, 4, 12, 10.1, 0.8, 0.75, 540, 650],
            'D40': [40, 24, 0.6, 26, 8.3, 4, 13, 10.9, 0.86, 0.81, 550, 660],
            'D50': [50, 30, 0.6, 29, 9.3, 4, 14, 11.8, 0.93, 0.88, 620, 750],
            'D60': [60, 36, 0.6, 32, 10.5, 4.5, 17, 14.3, 1.13, 1.06, 700, 840],
            'D70': [70, 42, 0.6, 34, 13.5, 5, 20, 16.8, 1.33, 1.25, 900, 1080],
            'T200': [11,    8.5, 0.4, 10,    2.8, 0.85, 7   , 2.8,  0.2, 0.6, 290, 350],     # Normer for bygningskonstruktioner 4. Trækonstruktioner
            'T300': [14.5, 12.5, 0.4, 12.5,  2.8, 1.4, 9   , 3.5, 0.25, 0.6, 290, 350],
            'T400': [18  , 16.5, 0.4, 15  ,  2.8, 1.4, 10.5, 4.2, 0.30, 0.6, 290, 350]}
        self.Struct_timber = pd.DataFrame(Struct_timber_dataset)
        self.Struct_timber.set_index("strength class", inplace = True)
        
        # Glue laminated strength properties
        GlueLaminated_strength_dataset = {
            'Glulam strength class': ['Bending strength, f_m,g,k [MPa]','Tension strength, f_t,0,g,k [MPa]','Tension strength, f_t,90,g,k [MPa]','Compression strength, f_c,0,g,k [MPa]','Compression strength, f_c,90,g,k [MPa]','Shear strength, f_v,g,k [MPa]','Modulus of elasticity, E_0,g,mean [GPa]','Modulus of elasticity, E_0,g,05 [GPa]','Modulus of elasticity, E_90,g,mean [GPa]','Shear modulus, G_g,mean [GPa]','Density rho_g,k [kg/m^3]'],
            'GL 24h': [24, 16.5, 0.4, 24, 2.7, 2.7, 11.6, 9.4, 0.39, 0.72, 380],
            'GL 28h': [28, 19.5, 0.45, 26.5, 3, 3.2, 12.6, 10.2, 0.42, 0.78, 410],
            'GL 32h': [32, 22.5, 0.5, 29, 3.3, 3.8, 13.7, 11.1, 0.46, 0.85, 430],
            'GL 24c': [24, 14, 0.35, 21, 2.4, 2.2, 11.6, 9.4, 0.32, 0.59, 350],
            'GL 28c': [28, 16.5, 0.4, 24, 2.7, 2.7, 12.6, 10.2, 0.39, 0.72, 380],
            'GL 30c': [30, 19.5, 0.5, 24.5, 2.5, 3.5, 13, 10.8, 0.3, 0.65, 430],
            'GL 32c': [32, 19.5, 0.45, 26.5, 3, 3.2, 13.7, 11.1, 0.42, 0.78, 410]}
        self.Glulam_strength = pd.DataFrame(GlueLaminated_strength_dataset)
        self.Glulam_strength.set_index("Glulam strength class", inplace = True)
        
        # # Plywood strenngth properties
        # Plywood_strength_dataset = {
        #     'Plywood type': ['Thickness','f_m0k','f_m90k','f_c0k','f_c90k','f_t0k','f_t90k','f_vk','f_rk','rho_k','rho_mean','G_v,mean','E_m0,mean','E_m90,mean','E_t/c,0,mean','E_t/c,90,mean'],
        #     'American plywood': [12.5, 23.5, 12.2, 13.9, 8.1, 13.6, 7.2, 3.2, 0.9, 410, 460, 500, 10300, 2500, 6800, 4600],
        #     'Grade: C-D Exposure 1': [14.8, 10.1, 10.6, 7.7, 10.5, 6.9, 3.2, 0.9, 410, 460, 500, 7800, 2500, 5200,3900],
        #     'Swedish plywood': [12, 23.0, 11.4, 15, 12, 15, 12, 2.9, 0.9, 410, 460, 500, 9200, 4600, 7200, 4800],
        #     'Grade: P30': [24, 21.6, 12.4, 15.4, 11.4, 15.4, 11.4, 2.9, 0.9, 410, 460, 500, 8700, 5000, 7400, 4600]}
        # self.Plywood_strength = pd.DataFrame(Plywood_strength_dataset)
        # self.Plywood_strength.set_index("Plywood type", inplace = True)
        
        # Imperfektion factor beta_c
        Imperfaktion_factor_betac_dataset = {
            'Description': ['Solid timber', 'Glued-laminated', 'LVL'],
            'Betac': [0.2, 0.1, 0.1]}
        self.Imperfaktion_factor_betac = pd.DataFrame(Imperfaktion_factor_betac_dataset)
        self.Imperfaktion_factor_betac.set_index("Description", inplace = True)
        
        
    def getElasticity(self, woodType):
        if 'GL' in woodType:
            E = self.Glulam_strength[woodType]['Modulus of elasticity, E_0,g,mean [GPa]']*10**9
        else:
            E = self.Struct_timber[woodType]['Mean modulus of elasticity, E_0,mean [GPa]']*10**9
        return E
    
    def getElasticity_E005k(self, woodType):
        if 'GL' in woodType:
            E_005k = self.Glulam_strength[woodType]['Modulus of elasticity, E_0,g,05 [GPa]']*10**9
        else:
            E_005k = self.Struct_timber[woodType]['Modulus of elasticity, E_0,05 [GPa]']*10**9
        return E_005k
    
    def getShearElasticity(self, woodType):
        if 'GL' in woodType:
            G = self.Glulam_strength[woodType]['Shear modulus, G_g,mean [GPa]']*10**9
        else:
            G = self.Struct_timber[woodType]['Mean shear modulus, G_mean [GPa]']*10**9
        return G
    
    def getShear(self, woodType):
        if 'GL' in woodType:
            E = self.Glulam_strength[woodType]['Shear modulus, G_g,mean [GPa]']*10**9
        else:
            E = self.Struct_timber[woodType]['Mean shear modulus, G_mean [GPa]']*10**9
        return E
    
    def getDensity(self, woodType):
        if 'GL' in woodType:
            rho = self.Glulam_strength[woodType]['Density rho_g,k [kg/m^3]']
        else:
            rho = self.Struct_timber[woodType]['Mean density, rho_mean [kg/m^3]']
        return rho
    
    def getCharacteristicDensity(self, woodType):
        if 'GL' in woodType:
            rho = self.Glulam_strength[woodType]['Density rho_g,k [kg/m^3]']
        else:
            rho = self.Struct_timber[woodType]['Density, rho_k [kg/m^3]']
        return rho
    
    def get_f_mk(self, woodType):
        if 'GL' in woodType:
            f_mk = self.Glulam_strength[woodType]['Bending strength, f_m,g,k [MPa]']*10**6
        else:
            f_mk = self.Struct_timber[woodType]['Bending strength, f_m,k [MPa]']*10**6
        return f_mk
    
    def get_f_vk(self, woodType):
        if 'GL' in woodType:
            f_vk = self.Glulam_strength[woodType]['Shear strength, f_v,g,k [MPa]']*10**6
        else:
            f_vk = self.Struct_timber[woodType]['Shear strength, f_v,k [MPa]']*10**6
        return f_vk
    
    def get_f_c0k(self, woodType):
        if 'GL' in woodType:
            f_c0k = self.Glulam_strength[woodType]['Compression strength, f_c,0,g,k [MPa]']*10**6
        else:
            f_c0k = self.Struct_timber[woodType]['Compression strength, f_c,0,k [MPa]']*10**6
        return f_c0k
    
    def get_f_t0k(self, woodType):
        if 'GL' in woodType:
            f_t0k = self.Glulam_strength[woodType]['Tension strength, f_t,0,g,k [MPa]']*10**6
        else:
            f_t0k = self.Struct_timber[woodType]['Tension strength, f_t,0,k [MPa]']*10**6
        return f_t0k
    
    def get_f_t90k(self, woodType):
        if 'GL' in woodType:
            f_t90k = self.Glulam_strength[woodType]['Tension strength, f_t,90,g,k [MPa]']*10**6
        else:
            f_t90k = self.Struct_timber[woodType]['Tension strength, f_t,90,g,k [MPa]']*10**6
        return f_t90k
    
    def get_f_c90k(self, woodType):
        if 'GL' in woodType:
            f_c90k = self.Glulam_strength[woodType]['Compression strength, f_c,90,g,k [MPa]']*10**6
        else:
            f_c90k = self.Struct_timber[woodType]['Compression strength, f_c,90,k [MPa]']*10**6
        return f_c90k
    
    def getGammaM(self, state):      
        gammaM = self.gamma_M['gamma_M'][state]
        return gammaM
    
    def getKdef(self, serviceClass, material):      
        k_def = self.k_def[serviceClass][material]
        return k_def
    
    def getKmod(self, LoadType, material):      
        k_mod = self.k_mod[LoadType][material]
        return k_mod
        
    def getImperfection_factor_betac(self,woodtype):
        return self.Imperfaktion_factor_betac['Betac'][woodtype]
    
    def getPartial_safetyfactor(self):
        return self.gamma_M['gamma_M']['ULS - solid timber, grade stamp individually marked']
    
    def getPartial_safetyfactor_connection(self):
        return self.gamma_M['gamma_M']['ULS - solid timber, grade stamp individually marked']
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

