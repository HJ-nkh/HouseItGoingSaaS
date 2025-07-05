# -*- coding: utf-8 -*-
"""
Created on Sat Oct 22 12:35:58 2022

@author: danie
"""

import pandas as pd

# Standard beskrivelse
# Byggestenstrykstyrke  = fb 
# Mørteltrykstyrke      = fm
# Karakteristisk styrke = fk
# Ritterkonstanten      = ke

class MurProp:
    def __init__(self):
        # Materialeegenskaber for standard murværk. Enheder: MPa,meter. fvk0 = 0.15
        standard_murvaerk_parametre_dataset = {
            'Beskrivelse': ['fb', 'fm', 'fk','gamma_c','højde skifter', 'keFactor','E0k','Density'],
            'Gammelt murværk': [15,1.0,2.4,1.84,0.066,300,355,2000],
            'TJEK Stenklasse 15 - 20/80/550': [15,4.5,5.75,1.7,0.066,300,'kender den ikke lige',2000],
            'Standard murværk': [15,0.9,3.55,1.7,0.066,300,'kender den ikke lige',2000],
            'Stenklasse 20 - 20/80/550': [20,4.5,7.1,1.7,0.066,400,'kender den ikke lige',2000],
            'Stenklasse 25 - 20/80/550': [25,0.9,8.7,1.7,0.066,500,'kender den ikke lige',2000],
            'Stenklasse 30 - 20/80/550': [30,0.9,9.3,1.7,0.066,600,'kender den ikke lige',2000],
            'Porebeton': [4.5,0.9,3.4,1.7,0.2,596,2025,600],
            'TJEK2 Stenklasse 15 - 20/80/550': [15,0.9,5.75,1.7,0.066,300,'kender den ikke lige',2000]}

        self.standard_murvaerk_parametre = pd.DataFrame(standard_murvaerk_parametre_dataset)
        self.standard_murvaerk_parametre.set_index("Beskrivelse", inplace = True)
        
        # K-faktor til bestemmelse af karakteristisk trykstyrke. Værdien 0 betyder at der ikke er angivet en værdi. Tabel XX DS_ INF 167
        K_faktor_dataset = {
            'Beskrivelse': ['Tegl1', 'Tegl2', 'Tegl3', 'Kalksandsten1', 'Kalksandsten2', 'Letklinkerbeton1','Letklinkerbeton2','Letklinkerbeton3','Porebeton1'],
            'Byggesten':   ['Gruppe 1', 'Gruppe 2', 'Gruppe 3', 'Gruppe 1', 'Gruppe 2', 'Gruppe 1', 'Gruppe 2','Gruppe 3', 'Gruppe 1'],   
            'Normalmørtel og tyndfugemørtel': [0.55, 0.45, 0.35, 0.55, 0.45, 0.55, 0.45, 0.40, 0.55],
            'Limfugemørtel': [0.75, 0.70, 0.5, 0.8, 0.65, 0.8, 0.65, 0.5, 0.8 ],
            'Letmørtel med densitet mellem 600-800 kg/m3': [0.3, 0.25, 0.2, 0, 0, 0.45, 0.45, 0, 0],
            'Letmørtel med densitet mellem 800-1300 kg/m3': [0.4, 0.3, 0.25, 0, 0, 0.45, 0.45, 0, 0]}
        self.K_faktor = pd.DataFrame(K_faktor_dataset)
        self.K_faktor.set_index("Beskrivelse", inplace = True)

    # Basisbøjningstræstyrker fxk1 og fxk2 for murværk med en højde >= 185mm. [MPa]
        boejningstraekstyrker_185_dataset = {
            'Beskrivelse': ['Letklinkerbeton', 'Porebeton', 'Tegl'],
            'fc': [2.4, 2.4, 10],   
            'fm': [2.9, 2.9, 15],
            'fxk1': [0.20, 0.20, 0.20],
            'fxk2': [0.45, 0.45, 0.45]}
        self.boejningstraekstyrker_185 = pd.DataFrame(boejningstraekstyrker_185_dataset)

    # Regningsmæssige bøjningstrækstyrker fxd1 for murværk med h <=60mm bestem ud fra vedhæftningsstyrken fmxk1 og byggestenenes normaliserede trykstyrke fb. [MPa] Tabel 4c DS_ INF 167
        boejningstraekstyrker_fxk1_60_dataset = {
            'fmxk1': [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7],
            5:  [0, 0.06, 0.08, 0.10, 0.13, 0.15, 0.17, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18],   
            10: [0, 0.08, 0.11, 0.13, 0.16, 0.18, 0.20, 0.22, 0.23,0.24, 0.24, 0.24, 0.24, 0.24],
            15: [0, 0.09, 0.13, 0.16, 0.19, 0.21, 0.23, 0.26, 0.28,0.29, 0.30, 0.30, 0.30, 0.30],
            20: [0, 0.10, 0.14, 0.18, 0.21, 0.24, 0.26, 0.28, 0.31,0.33, 0.35, 0.35, 0.35, 0.35],
            25: [0, 0.10, 0.14, 0.19, 0.23, 0.26, 0.28, 0.31, 0.33, 0.36, 0.38, 0.40, 0.40, 0.40],
            30: [0, 0.10, 0.14, 0.19, 0.24, 0.28, 0.31, 0.34, 0.36,0.39, 0.41, 0.43, 0.45, 0.45],
            35: [0, 0.10, 0.14, 0.19, 0.24, 0.28, 0.32, 0.36, 0.38,0.41, 0.43, 0.45, 0.48, 0.50],
            40: [0, 0.10, 0.14, 0.19, 0.24, 0.28, 0.32, 0.38, 0.41,0.43, 0.46, 0.48, 0.50, 0.53],
            45: [0, 0.10, 0.14, 0.19, 0.24, 0.28, 0.32, 0.38, 0.44,0.46, 0.48, 0.51, 0.53, 0.55]}
        self.boejningstraekstyrker_fxk1_60 = pd.DataFrame(boejningstraekstyrker_fxk1_60_dataset)
        self.boejningstraekstyrker_fxk1_60.set_index("fmxk1", inplace = True)
        self.fmxk1_list = list(self.boejningstraekstyrker_fxk1_60.index.values)
        
        # Regningsmæssige bøjningstrækstyrker fxd2 for murværk med h <=60mm bestem ud fra vedhæftningsstyrken fmxk1 og byggestenenes normaliserede trykstyrke fb. [MPa]
        boejningstraekstyrker_fxk2_60_dataset = {
            'fxk1': [0, 0.1,  0.15, 0.2,  0.25, 0.3,  0.35, 0.4],
            5:      [0, 0.29, 0.32, 0.36, 0.40, 0.44, 0.49, 0.53],   
            10:     [0, 0.32, 0.39, 0.43, 0.47, 0.51, 0.56, 0.60],
            15:     [0, 0.34, 0.44, 0.48, 0.52, 0.57, 0.61, 0.65],
            20:     [0, 0.34, 0.49, 0.54, 0.59, 0.63, 0.67, 0.71],
            25:     [0, 0.34, 0.50, 0.60, 0.64, 0.68, 0.73, 0.77],
            30:     [0, 0.34, 0.50, 0.64, 0.69, 0.73, 0.77, 0.82],
            35:     [0, 0.34, 0.50, 0.66, 0.74, 0.78, 0.82, 0.87],
            40:     [0, 0.34, 0.50, 0.66, 0.79, 0.84, 0.88, 0.92],
            45:     [0, 0.34, 0.50, 0.66, 0.82, 0.89, 0.93, 0.98]}
        self.boejningstraekstyrker_fxk2_60 = pd.DataFrame(boejningstraekstyrker_fxk2_60_dataset)
        self.boejningstraekstyrker_fxk2_60.set_index("fxk1", inplace = True)
        self.fxk1_list = list(self.boejningstraekstyrker_fxk2_60.index.values)
        
        # Basis trykstyrker fk for murværk af massive letklinkerbetonbyggesten med højde >= 185mm. Tabel 2 DS_INF_167
        basisTrykstyrkeLetklinkerbeton_fk_185_dataset = {
            'fb': ['fk'],
            2.0:  [1.8],   
            2.5:  [2.2],
            3.0:  [2.6],
            3.5:  [3.1],
            4.0:  [3.5],
            4.5:  [3.9],
            5.0:  [4.4]}
        self.basisTrykstyrkeLetklinkerbeton_fk_185 = pd.DataFrame(basisTrykstyrkeLetklinkerbeton_fk_185_dataset)
        self.basisTrykstyrkeLetklinkerbeton_fk_185.set_index("fb", inplace = True)
        self.fkLetklinkerbeton185_list = list(self.basisTrykstyrkeLetklinkerbeton_fk_185.index.values)
        
        # Basis trykstyrker fk for murværk af massive porebetonbetonbyggesten med højde >= 185mm. Tabel 2 DS_INF_167
        basisTrykstyrkePorebeton_fk_185_dataset = {
            'fb': ['fk'],
            2.0:  [1.5],   
            2.5:  [1.9],
            3.0:  [2.3],
            3.5:  [2.7],
            4.0:  [3.0],
            4.5:  [3.4],
            5.0:  [3.8]}
        self.basisTrykstyrkePorebeton_fk_185 = pd.DataFrame(basisTrykstyrkePorebeton_fk_185_dataset)
        self.basisTrykstyrkePorebeton_fk_185.set_index("fb", inplace = True)
        self.fkPorebeton185_list = list(self.basisTrykstyrkePorebeton_fk_185.index.values)
        
        # Friktionskoefficient og kohæsion
        friktionskoefficient_kohaesion_dataset = {
            'fugetype': ['mørtelfuge (fm<0.5MPa)', 'mørtelfuge (fm>=0.5MPa)',  'mørtelfuge (til ugunst)', 'mørtelfuge på fugtspærre',  'mørtelfuge på fugtspærre (til ugunst)'],
            'muk':      [0.6, 1, 2, 0.4, 0.7],   
            'fvk0':     ['fxk1', 'fxk1', '2.5*fxk1', 0, 0.03]}
        self.friktionskoefficient_kohaesion = pd.DataFrame(friktionskoefficient_kohaesion_dataset)
        self.friktionskoefficient_kohaesion.set_index("fugetype", inplace = True)
        self.friktionskoefficient_kohaesion_list = list(self.friktionskoefficient_kohaesion.index.values)
        
        # Partial koefficient for kontrolklasse
        partial_koefficient_kontrol_dataset = {
            'Kontrolklasse': ['gamma3'],
            'Skærpet': [0.95],   
            'Normal': [1.0],
            'Lempet': [1.1]}
        partial_koefficient_kontrol = pd.DataFrame(partial_koefficient_kontrol_dataset)
        
        # Partial koefficienter in-situ til murværks trykstyrke og E-modul
        partial_koefficient_kontrol_dataset = {
            'Beskrivelse': ['Kategori 1 byggesten', 'Kategori 2 byggesten', 'Armeret murværk','Murværks bøjningstrækstyrke', 'Armeringsstyrker', 'Armerings vedhæftningsstyrke','Kohæsion', 'Friktionskoefficienter'],
            'Gammac': [1.6,1.7,1.45,1.7,1.2,1.7,1.7,1.3]}
        self.partial_koefficient_kontrol = pd.DataFrame(partial_koefficient_kontrol_dataset)
        
        # Partial koefficienter in-situ til murværks trykstyrke og E-modul
        partial_koefficient_kontrol_insitu_dataset = {
            'Beskrivelse': ['Kategori 1 byggesten', 'Kategori 2 byggesten', 'Armeret murværk','Murværks bøjningstrækstyrke', 'Armeringsstyrker', 'Armerings vedhæftningsstyrke','Kohæsion', 'Friktionskoefficienter'],
            'Gammac': [1.6,1.7,1.45,1.7,1.2,1.7,1.7,1.3]}
        self.partial_koefficient_kontrol_insitu = pd.DataFrame(partial_koefficient_kontrol_insitu_dataset)

        # Partial koefficienter præfabrikeret til murværks trykstyrke og E-modul
        partial_koefficient_kontrol_praefab_dataset = {
            'Beskrivelse': ['Kategori 1 byggesten', 'Kategori 2 byggesten', 'Armeret murværk','Murværks bøjningstrækstyrke', 'Armeringsstyrker'],
            'Gammac': [1.55,1.65,1.40,1.6,1.2]}
        self.partial_koefficient_kontrol_praefab = pd.DataFrame(partial_koefficient_kontrol_praefab_dataset)
        
        # Partial koefficienter for bindere.
        partial_koefficient_bindere_dataset = {
            'Beskrivelse': ['Flydespænding', 'E-modul', 'Forankring'],
            'gammab': [1.2, 1.2, 1.7]}
        self.partial_koefficient_bindere = pd.DataFrame(partial_koefficient_bindere_dataset)
        self.partial_koefficient_bindere.set_index("Beskrivelse", inplace = True)
        self.partial_koefficient_bindere_list = list(self.partial_koefficient_bindere.index.values)
        
        # Materiale parametre bindere
        parametre_bindere_dataset = {
            'Beskrivelse': ['Rustfast stål', 'Tinbronze 720', 'Tinbronze 480'],
            'Flydespænding': [600, 720, 480],
            'E-modul': [200000, 120000, 120000]}
        self.parametre_bindere = pd.DataFrame(parametre_bindere_dataset)
        self.parametre_bindere.set_index("Beskrivelse", inplace = True)
        self.parametre_bindere_list = list(self.parametre_bindere.index.values)
        
        # km-faktor til beregning af forskydningsbærevnen. Afsnit 3.6.2 DS_ INF 167
        km_dataset = {
            'Beskrivelse': ['teglbyggesten', 'letbetonbyggesten'],
            'km': [0.07,0.20]}
        self.km = pd.DataFrame(km_dataset)
        
        # Relation mellem mørtels trykstyrke fm, bøjningstrykstyrke fm,t og blandingsforhold. Tabel 1 DS_INF 167
        boejningstraekstyrkeMoertel_fm_dataset = {
            'Blandingsforhold': ['Min. trykstyrke MC/ML', 'Min. bøjningstrækstyrke, fm'],
            'KC60/40/850':  ['ML 0,8 MPa', '0,2 MPa'],   
            'KC50/50/700':  ['MC 0,9 MPa/ML 1,8 MPa', '0,5 MPa'],
            'KC35/65/650':  ['MC 2 MPa', '0,6 MPa'],
            'KC20/80/550':  ['MC 4,5 MPa','1,4 MPa']}
        self.boejningstraekstyrkeMoertel_fm = pd.DataFrame(boejningstraekstyrkeMoertel_fm_dataset)
        self.boejningstraekstyrkeMoertel_fm.set_index("Blandingsforhold", inplace = True)
        self.boejningstraekstyrkeMoertel_fm_list = list(self.boejningstraekstyrkeMoertel_fm.index.values)
        
        
    def getStandard_murvaerk_parametre(self, murType, parameter):
        if parameter == 'fb' or parameter == 'fm' or parameter == 'fk' or parameter == 'E0k':
            SIconvert = 10**6
        else:
            SIconvert = 1
        return SIconvert*self.standard_murvaerk_parametre[murType][parameter]
    
    def getK_Faktor_murvaerk(self,Moertel,typeByggesten):
        return self.K_faktor[Moertel][typeByggesten]
    
    # Trykstyrker blokke (Letklinkerbeton og Porebeton)
    def getTrykstyrkePorebeton_fk_185(self,fb):
        return self.basisTrykstyrkePorebeton_fk_185[fb]['fk']
    
    def getTrykstyrkeLetklinkerbeton_fk_185(self,fb):
        return self.basisTrykstyrkeLetklinkerbeton_fk_185[fb]['fk']
    
    # Bøjningstræstyrker
    def getFmxk1_list(self):
        return self.fmxk1_list
    
    def getFxk1_list(self):
        return self.fxk1_list
    
    def getBoejningstraekstyrke_fxk1(self,fb,fmxk1):
        return self.boejningstraekstyrker_fxk1_60[fb][fmxk1]

    def getBoejningstraekstyrke_fxk2(self,fb,fxk1):
        return self.boejningstraekstyrker_fxk2_60[fb][fxk1]
    
    # Friktion og kohæsion
    def getFriktionKohæsion(self,fugetype,parameter):
        return self.friktionskoefficient_kohaesion[parameter][fugetype]
    
    # Materiale parametre bindere
    def getParametreBindere(self,typeBindere,parameter):
        return self.parametre_bindere[parameter][typeBindere]
    
    # Partial koefficienter bindere
    def getPartialkoefficienterBindere(self,parameter):
        return self.partial_koefficient_bindere['gammab'][parameter]
    
m = MurProp()


