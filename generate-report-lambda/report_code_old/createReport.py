# -*- coding: utf-8 -*-
"""
Created on Tue Apr 12 10:37:07 2022

@author: Nicolas
"""

from docxtpl import DocxTemplate, InlineImage
import os
#Program to analyze 2D frames
import numpy as np
import math
import matplotlib.pyplot as plt
from matplotlib.path import Path
import matplotlib.patches as patches
from numpy.linalg import multi_dot
import matplotlib.collections as mcoll
from matplotlib.collections import LineCollection
import matplotlib.colors as mcolors
import matplotlib as mpl
from docx.shared import Mm
from Steel_fire import steeltempfire
from plots import ReportPlots
from PIL import Image


class CreateReport:
    def run(self, s):
        project = s.project
        
        try:
            projectNumber = project.projectNumber
        except:         
            if 'projectNumber' not in locals():
                print('No project number added and therefore no report created!')
                return
            
        filenames=os.listdir("C:/Users/Nicolas/Dropbox/!P - Projekt/")          
        for names in filenames:
            if names.find(project.projectNumber) != -1:
                projectFolder = names
                
                first = names.find(',')
                sec = names.find(',',first+1)
                third = names.find(',',sec+1)
                
                project.road = names[first+2:sec]
                project.city = names[sec+2:third]
                project.name = names[third+2:]               
                break
            
        #member = s.member
        ECmembers = s.loadCombinations[list(s.loadCombinations.keys())[0]]
        ECmembers = ECmembers[list(ECmembers.keys())[0]]

        plots = ReportPlots()
        
        plots.plotSectionForcesMemberEnvelope(s, project.projectNumber, 'ULS')
        #plots.plotSectionForcesGlobal(s, ECmembers, project.projectNumber, 'M', loadcombPlots)

        #plots.sectionForceColor(s, s.model, ECmembers, project.projectNumber, 'F1', loadcombPlots)
        # plots.sectionForceColor(s, s.model, ECmembers, project.projectNumber, 'F2', loadcombPlots)
        # plots.sectionForceColor(s, s.model, ECmembers, project.projectNumber, 'M', loadcombPlots)

        ImagePath = "C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/06 Statisk rapport/Billeder/"
        image_paths = {}
        
        for i, m in enumerate(ECmembers):
            
            plots.staticPlot(s.model, ECmembers, i, project.projectNumber)
            
            color = [4/255,10/255,161/255]
            mat = s.sectionResults[i]['UR_loadcomb_mat_ULS']
            URnames = s.sectionResults[i]['URnames_ULS']
            URcombnames = s.sectionResults[0]['LoadCombnames_ULS']
            
            membertype = m.beamtype
            memberprop = m.beamprop
            
            plots.URmat(mat, URnames, URcombnames, color, project.projectNumber, i)
            
            context = {}
            
            last = []
            for ii in range(s.numOfLoads):
                if np.isnan(s.coor2[ii][0]) or np.isnan(s.coor2[ii][1]): #punktlast
                    last.append({'laster' : s.loadtypes[ii],
                                     'enhed' : 'kN',
                                     'lasttype' : 'Punktlast',
                                     'coor1' : str(s.coor1[ii]),
                                     'coor2' : ' - ',
                                     'Fx1' : str(self.num2deci(s.Fxy1[ii][0]*10**-3)),
                                     'Fx2' : ' - ',
                                     'Fy1' : str(self.num2deci(s.Fxy1[ii][1]*10**-3)),
                                     'Fy2' : ' - '})
                else:
                    last.append({'laster' : s.loadtypes[ii],
                                     'enhed' : 'kN/m',
                                     'lasttype' : 'Linjelast',
                                     'coor1' : str(s.coor1[ii]),
                                     'coor2' : str(s.coor2[ii]),
                                     'Fx1' : str(self.num2deci(s.Fxy1[ii][0]*10**-3)),
                                     'Fx2' : str(self.num2deci(s.Fxy2[ii][0]*10**-3)),
                                     'Fy1' : str(self.num2deci(s.Fxy1[ii][1]*10**-3)),
                                     'Fy2' : str(self.num2deci(s.Fxy2[ii][1]*10**-3))})
            
            if membertype == 'Stål':
                if 'HE' in memberprop['profile'] or 'IP' in memberprop['profile'] or 'UN' in memberprop['profile']:
                    if 'HE' in memberprop['profile'] or 'IP' in memberprop['profile']:
                        self.reportType = 'Bjælkeeftervisning_stål'
                    elif 'UN' in memberprop['profile']:
                        self.reportType = 'Bjælkeeftervisning_UNP_stål'
                
                    context.update({'last' : last,
                                'Vej' : project.road,
                                'By' : project.city,
                                'Projektnummer' : project.projectNumber,
                                'navn_bjaelke' : str(m.beamname),
                                'L' : self.num2deci(m.L),
                                'profil' : str(memberprop['profile']).replace('.',','),
                                'tvaersnitsklasse' : str(m.tvaersnitsklasse).replace('.',','),
                                'konsekvensklasse' : str(s.konsekvensklasse).replace('.',','),
                                'KFi' : str(s.KFi).replace('.',','),
                                'b' : self.itanum(m.b*1000),
                                'h' : self.itanum(m.h*1000),
                                'd' : self.itanum(m.d*1000),
                                't' : self.itanum(m.t*1000),
                                'A' : self.itanum(m.A*10**6),
                                'r' : self.itanum(m.r*1000),
                                'g' : self.num2deci(m.g),
                                'totalweight' : self.itanum(m.totalweight),
                                'I_y' : self.itanum(m.beam['I']*10**12),
                                'I_z' : self.itanum(m.I_z*10**12),
                                'I_v' : self.itanum(m.I_v*10**12),
                                'I_w' : self.itanum(m.I_w*10**18),
                                'W_el' : self.itanum(m.W_ely*10**9),
                                'W_pl' : self.itanum(m.W_pl*10**9),
                                'staalkval' : m.steelgrade,
                                'E' : self.itanum(m.E*10**-9),
                                'G' : self.itanum(m.G*10**-9),
                                'rho' : self.itanum(m.rho),
                                'gamma_M0' : self.num2deci(m.gamma_M0),
                                'gamma_M1' : self.num2deci(m.gamma_M1),
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
                                'f_y_flange' : self.itanum(m.f_y_flange*10**-6),  
                                'f_y_krop' : self.itanum(m.f_y_krop*10**-6)})
                    
                    # ------------------------------------ Bøjning ----------------------------------------------#                
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Bøjningsmoment - DS/EN 1993-1-1 6.2.5']
                    ECmembers = s.loadCombinations['ULS'][critLoadComb]
                    m = ECmembers[i]
                    UR_boejningsmoment625 = m.UR_boejningsmoment625

                    plots.plotSectionForcesMember(s, project.projectNumber, 'ULS', critLoadComb)
                    image_paths['IMGsnitkraftBojning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    
                    context.update({'critLoadCombBoejning' : critLoadComb,                                                               
                                'M_cRd' : self.num2deci(m.M_cRd*10**-3),
                                'M_Ed' : self.num2deci(m.M_Ed*10**-3),
                                'UR_boejning625' : self.num2percent(m.UR_boejningsmoment625)})
                    
                    # ------------------------------------ Forskydning ----------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Forskydning - DS/EN 1993-1-1 6.2.6']
                    ECmembers = s.loadCombinations['ULS'][critLoadComb]
                    m = ECmembers[i]
                    UR_forskydning626 = m.UR_forskydning626

                    image_paths['IMGsnitkraftForskydning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftForskydning']):
                        plots.plotSectionForcesMember(s, project.projectNumber, 'ULS', critLoadComb)
                    
                    context.update({'critLoadCombForskydning' : critLoadComb, 
                                'A_v' : self.num2deci(m.A_v*10**6),
                                'V_plRd' : self.num2deci(m.V_plRd*10**-3),
                                'V_cRd' : self.num2deci(m.V_cRd*10**-3),
                                'V_Ed' : self.num2deci(m.V_Ed*10**-3),
                                'UR_forskydning626' : self.num2percent(m.UR_forskydning626)})
                    
                    # ------------------------------------ Tryk --------------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Tryk - DS/EN 1993-1-1 6.3.1']
                    ECmembers = s.loadCombinations['ULS'][critLoadComb]
                    m = ECmembers[i]
                    UR_Tryk631 = m.UR_Tryk631

                    image_paths['IMGsnitkraftTryk'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftTryk']):
                        plots.plotSectionForcesMember(s, project.projectNumber, 'ULS', critLoadComb)
                    
                    context.update({'critLoadCombTryk' : critLoadComb,
                                'soejletilfaelde' : m.soejletilfaelde,
                                'soejlekurve' : m.soejlekurve,
                                'alpha' : self.num2deci(m.alpha),
                                'Lambda' : self.num2deci(m.Lambda),
                                'N_cr' : self.num2deci(m.N_cr/1000),
                                'chi' : self.num2deci(m.chi),
                                'N_bRd' : self.num2deci(m.N_bRd/1000),
                                'N_Ed' : self.num2deci(m.N_Ed/1000),
                                'UR_Tryk631' : self.num2percent(m.UR_Tryk631)})
                    
                    # ------------------------------------ Kipning ----------------------------------------------#
                    # critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_kipning632']
                    # ECmembers = s.loadCombinations[critLoadComb]
                    # m = ECmembers[i]
                    # UR_kipning632 = m.UR_kipning632

                    # image_paths['IMGsnitkraftKipning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    # if not os.path.exists(image_paths['IMGsnitkraftKipning']):
                    #     plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)

                    # context.update({'critLoadCombKipning' : critLoadComb,         
                    #             'W_y' : self.num2deci(m.W_y*10**9),
                    #             'kl' : self.num2deci(m.kl),
                    #             'm4_u0' : self.num2deci(m.m4_u0),
                    #             'M_cr' : self.num2deci(m.M_cr*10**-3),
                    #             'lambda_LT' : self.num2deci(m.lambda_LT),
                    #             'kipningskurve' : m.kipningskurve,
                    #             'alpha_LT' : self.num2deci(m.alpha_LT),
                    #             'lambda_LT0' : self.num2deci(m.lambda_LT0),
                    #             'beta' : self.num2deci(m.beta),
                    #             'XLT' : self.num2deci(m.XLT),
                    #             'M_bRd' : self.num2deci(m.M_bRd*10**-3),
                    #             'UR_kipning632' : self.num2percent(m.UR_kipning632)})
                    
                    # ------------------------------------ Kropsforstærkning --------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Lokale tværgående kræfter - DS/EN 1993-1-3 6.1.7']
                    ECmembers = s.loadCombinations['ULS'][critLoadComb]
                    m = ECmembers[i]
                    UR_lokaleTvaergaaendeKraefter617 = m.UR_lokaleTvaergaaendeKraefter617

                    image_paths['IMGsnitkraftKropsforstaerkning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftKropsforstaerkning']):
                        plots.plotSectionForcesMember(s, project.projectNumber, 'ULS', critLoadComb)
                    
                    context.update({'critLoadCombKropsforstaerkning' : critLoadComb,         
                                'phi' : self.itanum(m.phi),
                                'h_w' : self.num2deci(m.h_w),
                                'Ss' : self.num2deci(m.Ss),
                                'k' : self.num2deci(m.k),
                                'k1' : self.num2deci(m.k1),
                                'k2' : self.num2deci(m.k2),
                                'k3' : self.num2deci(m.k3),
                                'k4' : self.num2deci(m.k4),
                                'k5' : self.num2deci(m.k5),
                                'R_wRd' : self.num2deci(m.R_wRd*10**-3),
                                'R' : self.num2deci(m.R*10**-3),
                                'UR_lokaleTvaergaaendeKraefter617' : self.num2percent(m.UR_lokaleTvaergaaendeKraefter617)})

                    # ------------------------------------ Deformation ----------------------------------------------#            
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_SLS']['Deformation']
                    ECmembers = s.loadCombinations['SLS'][critLoadComb]
                    m = ECmembers[i]
                    
                    UR_deformation = m.UR_deformation
                    
                    context.update({'critLoadCombDef' : critLoadComb,     
                                'def_criteria' : self.itanum(m.def_criteria),
                                'maxAllowable' : self.num2deci(m.maxAllowable*1000),
                                'max_def' : self.num2deci(m.max_def*1000),
                                'UR_deformation' : self.num2percent(m.UR_deformation),
                                'ULS_max' : self.num2percent(max(UR_boejningsmoment625, UR_forskydning626, UR_Tryk631)), #UR_kipning632
                                'SLS_max' : self.num2percent(UR_deformation)})
                    
    # --------------------------------------------------- brand -------------------------------------------------------------------------------
                    # ------------------------------------ Bøjning ----------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Bøjningsmoment - DS/EN 1993-1-1 6.2.5']
                    ECmembers = s.loadCombinations['ALS'][critLoadComb]
                    m = ECmembers[i]
                    
                    UR_boejningsmoment625_brand = m.UR_boejningsmoment625
                    
                    context.update({'critLoadCombBoejningB' : critLoadComb,                                                               
                                'M_cRdB' : self.num2deci(m.M_cRd*10**-3),
                                'M_EdB' : self.num2deci(m.M_Ed*10**-3),
                                'UR_boejning625B' : self.num2percent(m.UR_boejningsmoment625)})
                    
                    # ------------------------------------ Forskydning ----------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Forskydning - DS/EN 1993-1-1 6.2.6']
                    ECmembers = s.loadCombinations['ALS'][critLoadComb]
                    m = ECmembers[i]
                    
                    UR_forskydning626_brand = m.UR_forskydning626
                    
                    context.update({'critLoadCombForskydningB' : critLoadComb,
                                'V_cRdB' : self.num2deci(m.V_cRd*10**-3),
                                'V_EdB' : self.num2deci(m.V_Ed*10**-3),
                                'UR_forskydning626B' : self.num2percent(m.UR_forskydning626)})
                    
                    # ------------------------------------ Tryk --------------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Tryk - DS/EN 1993-1-1 6.3.1']
                    ECmembers = s.loadCombinations['ALS'][critLoadComb]
                    m = ECmembers[i]
                    
                    UR_Tryk631_brand = m.UR_Tryk631
                    
                    context.update({'critLoadCombTrykB' : critLoadComb,
                                'N_bRdB' : self.num2deci(m.N_bRd/1000),
                                'N_EdB' : self.num2deci(m.N_Ed/1000),
                                'UR_Tryk631B' : self.num2percent(m.UR_Tryk631)})
                    
                    # ------------------------------------ Kipning ----------------------------------------------#
                    # critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['UR_kipning632_brand']
                    # ECmembers = s.loadCombinations[critLoadComb]
                    # m = ECmembers[i]
                    
                    # UR_kipning632_brand = m.UR_kipning632
                    
                    # context.update({'critLoadCombKipningB' : critLoadComb,         
                    #             'M_bRdB' : self.num2deci(m.M_bRd*10**-3),
                    #             'UR_kipning632B' : self.num2percent(m.UR_kipning632)})
                    
                    # ------------------------------------ Kropsforstærkning --------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Lokale tværgående kræfter - DS/EN 1993-1-3 6.1.7']
                    ECmembers = s.loadCombinations['ALS'][critLoadComb]
                    m = ECmembers[i]
                    
                    UR_lokaleTvaergaaendeKraefter617_brand = m.UR_lokaleTvaergaaendeKraefter617
                    
                    context.update({'critLoadCombKropsforstaerkningB' : critLoadComb,         
                                'R_wRdB' : self.num2deci(m.R_wRd*10**-3),
                                'RB' : self.num2deci(m.R*10**-3),
                                'UR_lokaleTvaergaaendeKraefter617B' : self.num2percent(m.UR_lokaleTvaergaaendeKraefter617)})
                    
                    # ------------------------------------ Ståltemp ----------------------------------------------#
                    navne = {'Bøjning': UR_boejningsmoment625_brand, 'Forskydning': UR_forskydning626_brand, 'Tryk': UR_Tryk631_brand} #'Kipning': UR_kipning632_brand
                    vv = list(navne.values())
                    kk = list(navne.keys())
                    maxnavn = kk[vv.index(max(vv))]
                    ky = navne[maxnavn]
                    temp = steeltempfire(ky)
                    
                    context.update({'dimtil' : maxnavn,         
                                'ky' : self.num2deci(ky),
                                'temp' : self.itanum(temp),
                                'ALS_max' : self.num2deci(ky)})
                            
                
                elif 'RH' in memberprop['profile']:
                    self.reportType = 'Søjleeftervisning_RHS_stål'
                    
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ULS']['Tryk - DS/EN 1993-1-1 6.3.1']
                    ECmembers = s.loadCombinations['ULS'][critLoadComb]
                    m = ECmembers[i]
                    
                    context = { 'last' : last,
                                'critLoadCombTryk' : critLoadComb,
                                'Vej' : project.road,
                                'By' : project.city,
                                'Projektnummer' : project.projectNumber,
                                'navn_bjaelke' : str(m.beamname),
                                'L' : self.num2deci(m.L),
                                'profil' : str(memberprop['profile']).replace('.',','),
                                'tvaersnitsklasse' : str(m.tvaersnitsklasse).replace('.',','),
                                'konsekvensklasse' : str(s.konsekvensklasse).replace('.',','),
                                'KFi' : str(s.KFi).replace('.',','),
                                'b' : self.itanum(m.b*1000),
                                'h' : self.itanum(m.h*1000),
                                'd' : self.itanum(m.d*1000),
                                't' : self.itanum(m.t*1000),
                                'A' : self.itanum(m.A*10**6),
                                'r' : self.itanum(m.r*1000),
                                'I_y' : self.itanum(m.beam['I']*10**12),
                                'I_z' : self.itanum(m.I_z*10**12),
                                'I_v' : self.itanum(m.I_v*10**12),
                                'I_w' : self.itanum(m.I_w*10**18),
                                'W_el' : self.itanum(m.W_ely*10**9),
                                'W_pl' : self.itanum(m.W_pl*10**9),
                                'staalkval' : m.steelgrade,
                                'E' : self.itanum(m.E*10**-9),
                                'G' : self.itanum(m.G*10**-9),
                                'rho' : self.itanum(m.rho),
                                'gamma_M0' : self.num2deci(m.gamma_M0),
                                'gamma_M1' : self.num2deci(m.gamma_M1),
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
                                'f_y_flange' : self.itanum(m.f_y_flange*10**-6),
                                'f_y_krop' : self.itanum(m.f_y_krop*10**-6),
                                'soejletilfaelde' : m.soejletilfaelde,
                                'soejlekurve' : m.soejlekurve,
                                'alpha' : self.num2deci(m.alpha),
                                'Lambda' : self.num2deci(m.Lambda),
                                'N_cr' : self.num2deci(m.N_cr/1000),
                                'chi' : self.num2deci(m.chi),
                                'N_bRd' : self.num2deci(m.N_bRd/1000),
                                'N_Ed' : self.num2deci(m.N_Ed/1000),
                                'UR_Tryk631' : self.num2percent(m.UR_Tryk631)}
                    
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb_ALS']['Tryk - DS/EN 1993-1-1 6.3.1']
                    ECmembers = s.loadCombinations['ALS'][critLoadComb]
                    m = ECmembers[i]
                    
                    UR_Tryk631_brand = m.UR_Tryk631
                    
                    context.update({'critLoadCombTrykB' : critLoadComb,         
                                'N_bRdB' : self.num2deci(m.N_bRd/1000),
                                'N_EdB' : self.num2deci(m.N_Ed/1000),
                                'UR_Tryk631B' : self.num2percent(m.UR_Tryk631)})
                    
                    
                    navne = {'Tryk': UR_Tryk631_brand}
                    vv = list(navne.values())
                    kk = list(navne.keys())
                    maxnavn = kk[vv.index(max(vv))]
                    ky = navne[maxnavn]
                    temp = steeltempfire(ky)
                    
                    context.update({'dimtil' : maxnavn,         
                                'ky' : self.num2deci(ky),
                                'temp' : self.itanum(temp),
                                'ALS_max' : self.num2deci(ky)})
                
            
            elif membertype == 'Træ':
                if 'GL' in memberprop['strength class']:
                    self.reportType = 'Bjælkeeftervisning_træ'
                    
                    print('Report not implemented for Glue Laminated')
                
                    
                elif 'C' in memberprop['strength class'] or 'T' in memberprop['strength class']:
                    self.reportType = 'Bjælkeeftervisning_træ'
                    self.material = 'Konstruktionstræ'
                    
                    m = ECmembers[i]
                    
                    context = { 'last' : last,
                                'Vej' : project.road,
                                'By' : project.city,
                                'Projektnummer' : project.projectNumber,
                                'navn_bjaelke' : str(m.beamname).replace('.',','),
                                'material' : self.material,
                                'woodType2' : memberprop['strength class'],
                                'L' : self.num2deci(m.L),
                                'anvendelsesklasse' : m.anvendelsesklasse,
                                'konsekvensklasse' : str(s.konsekvensklasse).replace('.',','),
                                'KFi' : str(s.KFi).replace('.',','),
                                'b' : self.itanum(memberprop['b']*1000),
                                'h' : self.itanum(memberprop['h']*1000),
                                'A' : self.itanum(m.beam['A']*10**6),
                                'I' : self.itanum(m.beam['I']*10**12),
                                'f_mk' : self.num2deci(m.f_mk*10**-6),
                                'f_t0k' : self.num2deci(m.f_t0k*10**-6),
                                'f_t90k' : self.num2deci(m.f_t90k*10**-6),
                                'f_c0k' : self.num2deci(m.f_c0k*10**-6),
                                'f_c90k' : self.num2deci(m.f_c90k*10**-6),
                                'f_vk' : self.num2deci(m.f_vk*10**-6),
                                'E_mean' : self.num2deci(m.E_mean*10**-6),
                                'G_mean' : self.num2deci(m.G_mean*10**-6),
                                'rho' : self.itanum(m.rho),
                                'k_m' : self.num2deci(m.k_m),
                                'gamma_M' : self.num2deci(m.gamma_M),
                                'k_def' : self.num2deci(m.k_def),
                                }
                    # ------------------------------------ Forskydning ----------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_forskydning617']
                    ECmembers = s.loadCombinations[critLoadComb]
                    m = ECmembers[i]

                    plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)
                    image_paths['IMGsnitkraftForskydning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    
                    context.update({'critLoadCombForskydning' : critLoadComb,         
                                'k_cr' : self.num2deci(m.k_cr),
                                'A_cr' : self.itanum(m.A_cr*10**6),
                                'V_Ed' : self.num2deci(m.V_Ed/1000),
                                'tau' : self.num2deci(m.tau*10**-6),
                                'f_vd' : self.num2deci(m.f_vd*10**-6),
                                'UR_forskydning617' : self.num2percent(m.UR_forskydning617)})
                    

                    # -------------------------------------- Bøjning ----------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_boejning616']
                    ECmembers = s.loadCombinations[critLoadComb]
                    m = ECmembers[i]

                    image_paths['IMGsnitkraftBojning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftBojning']):
                        plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)
                    
                    context.update({'critLoadCombBoejning' : critLoadComb,         
                                'k_hm' : self.num2deci(m.k_hm),
                                'maxM' : self.num2deci(m.maxM*10**-3),
                                'sigma_myd' : self.num2deci(m.sigma_myd*10**-6),
                                'f_myd' : self.num2deci(m.f_myd*10**-6),
                                'UR_boejning616' : self.num2percent(m.UR_boejning616)})
                    
                    # ------------------------------------ Traek -------------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_traekParalleltMedFibrene612']
                    ECmembers = s.loadCombinations[critLoadComb]
                    m = ECmembers[i]

                    image_paths['IMGsnitkraftTraek'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftTraek']):
                        plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)
                    
                    context.update({'critLoadCombTraek' : critLoadComb,         
                                'k_ht' : self.num2deci(m.k_ht),
                                'N_tEd' : self.num2deci(m.N_tEd*10**-3),
                                'sigma_t0d' : self.num2deci(m.sigma_t0d*10**-6),
                                'f_t0d' : self.num2deci(m.f_t0d*10**-6),
                                'UR_traekParalleltMedFibrene612' : self.num2percent(m.UR_traekParalleltMedFibrene612)})
                    
                    # ------------------------------------ Tryk --------------------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_trykParalleltMedFibrene614']
                    ECmembers = s.loadCombinations[critLoadComb]
                    m = ECmembers[i]

                    image_paths['IMGsnitkraftTryk'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftTryk']):
                        plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)
                    
                    context.update({'critLoadCombTraek' : critLoadComb,         
                                'N_cEd' : self.num2deci(m.N_cEd*10**-3),
                                'sigma_c0d' : self.num2deci(m.sigma_c0d*10**-6),
                                'f_c0d' : self.num2deci(m.f_c0d*10**-6),
                                'UR_trykParalleltMedFibrene614' : self.num2percent(m.UR_trykParalleltMedFibrene614)})
                    
                    # ------------------------------------ Træk og boejning --------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_boejningOgTraek623']
                    ECmembers = s.loadCombinations[critLoadComb]
                    m = ECmembers[i]

                    image_paths['IMGsnitkraftTraekOgBoejning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftTraekOgBoejning']):
                        plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)
                    
                    context.update({'critLoadCombBoejningOgTraek' : critLoadComb,         
                                'UR_traekParalleltMedFibrene612' : self.num2percent(m.UR_traekParalleltMedFibrene612),
                                'UR_boejning616' : self.num2percent(m.UR_boejning616),
                                'UR_boejningOgTraek623' : self.num2percent(m.UR_boejningOgTraek623)})
                    
                    # ------------------------------------ Tryk og boejning --------------------------------------#
                    critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_boejningOgTryk624']
                    ECmembers = s.loadCombinations[critLoadComb]
                    m = ECmembers[i]

                    image_paths['IMGsnitkraftTrykOgBoejning'] = ImagePath + "Member" + str(i+1) + critLoadComb + ".png"
                    if not os.path.exists(image_paths['IMGsnitkraftTrykOgBoejning']):
                        plots.plotSectionForcesMember(s, project.projectNumber, critLoadComb)
                    
                    context.update({'critLoadCombBoejningOgTryk' : critLoadComb,         
                                'UR_trykParalleltMedFibrene614' : self.num2percent(m.UR_trykParalleltMedFibrene614),
                                'UR_boejning616' : self.num2percent(m.UR_boejning616),
                                'UR_boejningOgTryk624' : self.num2percent(m.UR_boejningOgTryk624)})
                    
            else:
                self.reportType = 'Murværkseftervisning'
                
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_ritter']
                ECmembers = s.loadCombinations[critLoadComb]
                m = ECmembers[i]
                UR_ritter = m.UR_ritter
                
                context.update({'last' : last,
                            'Vej' : project.road,
                            'By' : project.city,
                            'Projektnummer' : project.projectNumber,
                            'critLoadCombKropsforstaerkning' : critLoadComb,         
                            'fb' : self.num2deci(m.fb*10**-6),
                            'fm' : self.num2deci(m.fm*10**-6),
                            'fk' : self.num2deci(m.fk*10**-6),
                            'rho' : self.num2deci(m.rho),
                            'gamma_m' : self.num2deci(m.gamma_c),
                            't' : self.itanum(m.t*10**3),
                            'h' : self.itanum(m.h*10**3),
                            'L' : self.itanum(m.L*10**3),
                            'A_mur' : self.num2deci(m.A_mur),
                            'reduktion' : self.num2deci(m.reduktion),
                            'I' : self.itanum(m.I),
                            'l_plade' : self.itanum(m.l_plade*1000),
                            'e0' : self.itanum(m.e0),
                            'e5' : self.itanum(m.e5),
                            'efod' : self.itanum(m.efod),
                            'emaxRes' : self.itanum(m.emaxRes),
                            'hs' : self.itanum(m.hs*10**3),
                            'LV' : self.itanum(m.LV),
                            'tV' : self.itanum(m.tV),
                            'IV' : self.itanum(m.IV*10**12),
                            'LH' : self.itanum(m.LH),
                            'tH' : self.itanum(m.tH),
                            'IH' : self.itanum(m.IH*10**12),
                            'IT' : self.itanum(m.IT*10**12),
                            'inertimomentforhold' : self.num2deci(m.inertimomentforhold),
                            'pn' : self.num2deci(m.pn),
                            'ned' : self.num2deci(m.ned*10**-3),
                            'P1' : self.num2deci(m.N1*10**-3),
                            'P2' : self.num2deci(m.N2*10**-3),
                            'Ned' : self.num2deci(m.Ned*10**-3),
                            'Ntot' : self.num2deci(m.Ntot*10**-3),
                            'fd' : self.num2deci(m.fd*10**-6),
                            'ke' : self.itanum(m.ke),
                            'kt' : self.num2deci(m.kt),
                            'hef' : self.itanum(m.hef*10**3),
                            'lefm' : self.itanum(m.lefm*10**3),
                            'lam' : self.num2deci(m.lam),
                            'ks' : self.num2deci(m.ks),
                            'Rsd' : self.num2deci(m.Rsd*10**-3),
                            'UR_ritter' : self.num2percent(m.UR_ritter)})
            
                
                critLoadComb = s.sectionResults[i]['UR_CriticalLoadComb']['UR_konc']
                ECmembers = s.loadCombinations[critLoadComb]
                m = ECmembers[i]
                
                UR_konc = m.UR_konc
                
                context.update({'critLoadCombKropsforstaerkning' : critLoadComb,         
                            'b_plade' : self.itanum(m.b_plade*1000),
                            'A_plade' : self.itanum(m.A_plade*10**6),
                            'hv' : self.itanum(m.hv*1000),
                            'fd' : self.num2deci(m.fd*10**-6),
                            'beta' : self.num2deci(m.beta),
                            'NRdc' : self.num2deci(m.NRdc*10**-3),
                            'UR_konc' : self.num2percent(m.UR_konc)})       
      
            doc = DocxTemplate("C:/Users/Nicolas/HouseItGoing/reporting/!Report/" + self.reportType + ".docx")
            
            
            #--------------------- Add general member images --------------------------------------------------------
            max_width = 165  # Maximum width in mm based on page margins
            desired_height = 80  # Desired height in mm

            image_paths['IMGstatisksystem'] = ImagePath + "statisksystem" + str(i+1) + ".png"
            image_paths['IMGmatrixUR'] =  ImagePath + "ULSmatrix" + str(i+1) + ".png"
            image_paths['IMGsectionForceEnvelope'] = ImagePath + "Member" + str(i+1) + "SectionForceEnvelope" + ".png"

            for key, image_path in image_paths.items():
                image = Image.open(image_path)
                width_px, height_px = image.size
                dpi = image.info.get('dpi', (96, 96))  # Default DPI

                # Convert image size to mm
                width_mm = width_px / dpi[0] * 25.4
                height_mm = height_px / dpi[1] * 25.4

                # Calculate width at desired height
                width_at_desired_height = width_mm * (desired_height / height_mm)

                if width_at_desired_height <= max_width:
                    # Width is within limits, use desired height
                    context[key] = InlineImage(doc, image_descriptor=image_path, height=Mm(desired_height))
                else:
                    # Adjust height to fit max width
                    scaling_factor = max_width / width_mm
                    adjusted_height = height_mm * scaling_factor
                    context[key] = InlineImage(doc, image_descriptor=image_path, height=Mm(adjusted_height))
            
            if self.reportType == 'Murværkseftervisning':
            
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
            
            doc.save("C:/Users/Nicolas/Dropbox/!P - Projekt/" + projectFolder + "/" + str(self.reportType) + str(i+1) + ".docx")


    def itanum(self, x):
        try:
            num = format(int(x),',d').replace(",",".")
        except:
            num = 'NOT CONVERTED'
        return num
    
    def num2deci(self, x):
        return "{:.2f}".format(round(x,2)).replace(".",",")
    
    def num2percent(self, x):
        return "{} %".format(int(round(x * 100))).replace(".", ",")

    def ignore(self, x):
        try:
            return x*1
        except:
            return '!'

