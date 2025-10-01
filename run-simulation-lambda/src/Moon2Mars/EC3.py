# -*- coding: utf-8 -*-
"""
Created on Thu May  5 14:15:40 2022

@author: Nicolas
"""

from Moon2Mars.Steel_beams import SteelBeams
from Moon2Mars.Steel_parameters import SteelProp
import numpy as np


class EC3base:
    def __init__(self, selfS, member_discr):
        
        self.model = selfS.model
        self.project = selfS.project
        self.steelbeam = SteelBeams()
        self.steelprop = SteelProp()
        self.beam = member_discr
        self.beamname = member_discr['membername']
        self.beamprop = member_discr['memberprop']
        self.beamtype = member_discr['membertype']
        self.profile = self.beamprop['profile']
        self.steelgrade = self.beamprop['strength class']
        self.deflectionRequirement = self.beamprop.get('deflection requirement', None)
        self.deflectionIsLocal = self.beamprop.get('deflectionIsLocal', True)

        self.T = selfS.T_discr
        self.X = selfS.X_discr
        self.X_loc = selfS.X_loc_discr
        
        profile = self.profile
        self.E = member_discr['E']       
        self.L = member_discr['L']
        self.rho = member_discr['rho']
        self.I_w = self.steelbeam.getI_w(profile)        
        self.I_v = self.steelbeam.getI_v(profile)
        self.I_z = self.steelbeam.getI_z(profile)        
        self.G = self.steelprop.getShearModulus()
        self.h = self.steelbeam.get_h(profile)
        self.b = self.steelbeam.get_b(profile)
        self.A = self.steelbeam.get_A(profile)
        self.t = self.steelbeam.get_t(profile)
        self.d = self.steelbeam.get_d(profile)
        self.r = self.steelbeam.get_r(profile)
        self.g = self.steelbeam.get_g(profile)
        self.totalweight = self.g*self.L
            
        self.W_pl = self.steelbeam.getW_pl(self.profile)
        self.W_ely = self.steelbeam.getW_ely(self.profile)
        self.f_y_flange = self.steelprop.getYieldStrength(self.steelgrade, self.t)    
        self.f_y_krop = self.steelprop.getYieldStrength(self.steelgrade, self.d)
        if 'RH' in profile:
            self.f_y_krop = self.f_y_flange
            
    
        robustFaktorOn = selfS.project.robustFactorOnOff
        if robustFaktorOn:
            robustFaktor = 1.2
        else:
            robustFaktor = 1
        
        self.gamma_M1 = self.steelprop.getGamma('gamma_M1')*robustFaktor
        self.gamma_M0 = self.steelprop.getGamma('gamma_M0')*robustFaktor
        
        if 'IP' in self.profile:
            if self.steelgrade == 'S275':
                if self.h*1000 >= 450:
                    self.tvaersnitsklasse = 4
                elif self.h*1000 >= 330:
                    self.tvaersnitsklasse = 3
                elif self.h*1000 >= 240:
                    self.tvaersnitsklasse = 2
                else:
                    self.tvaersnitsklasse = 1
            elif self.steelgrade == 'S235':
                if self.h*1000 >= 400:
                    self.tvaersnitsklasse = 3
                elif self.h*1000 >= 270:
                    self.tvaersnitsklasse = 2
                else:
                    self.tvaersnitsklasse = 1
        else:
            self.tvaersnitsklasse = 1
            
class EC3calc:
    def __init__(self, ECbase):
        # Copy attributes from EC3base instance
        self.__dict__.update(ECbase.__dict__)
        self.UR = {}
   
    def boejningsmoment625(self):
        
        W_pl = self.W_pl

        gamma_M0 = self.gamma_M0
        
        f_y = self.f_y_flange    
        
        if self.UR_forskydning626 > 0.5:
            rho = (2*self.V_Ed/self.V_plRd-1)**2
            f_y = (1-rho)*f_y
            #f_y reduceret da forskydning er udnyttet mere end 0.5'
        
        self.M_Ed = np.max(np.abs(self.M))
               
        self.M_cRd = W_pl*f_y/gamma_M0
        
        self.UR_boejningsmoment625 = self.M_Ed/self.M_cRd
        self.UR['Bøjningsmoment - DS/EN 1993-1-1 6.2.5'] = self.UR_boejningsmoment625

    def forskydning626(self):
        
        profile = self.profile
        
        gamma_M0 = self.gamma_M0
        
        
        f_y = self.f_y_krop
        
        A = self.A
        b = self.b
        t_f = self.t
        t_w = self.d
        r = self.r
        h = self.h
        
        
        if 'HE' in profile or 'IP' in profile:
            
            A_v_1 = A-2*b*t_f+(t_w+2*r)*t_f
            A_v_2 = (h-2*t_f)*t_w
            
            A_v = np.max([A_v_1, A_v_2])
            
        elif 'UN' in profile:
            
            A_v = A-2*b*t_f+(t_w+r)*t_f
            
        elif 'RH' in profile:
            
            A_v = A*h/(b+h)
        
        else:
            raise SyntaxError('MUHAHA THIS BEAM TYPE IS NOT YET IMPLEMENTED FOR SHEAR AREA')
        
        
        V_plRd = A_v*(f_y/np.sqrt(3))/gamma_M0
        
        V_cRd = V_plRd
        
        V_Ed = np.max(np.abs(self.F2))
        
        
        self.UR_forskydning626 = V_Ed/V_cRd
        self.UR['Forskydning - DS/EN 1993-1-1 6.2.6'] = self.UR_forskydning626
        
        
        self.A_v = A_v
        self.V_plRd = V_plRd
        self.V_cRd = V_cRd
        self.V_Ed = V_Ed
        
    
    def trykpaavirkedeElementerMedKonstantTvaersnit631(self):
        
        profile = self.profile
            
        soejletilfaelde = 'simpel understøttet'
        if soejletilfaelde == 'simpel understøttet':
            N_cr = (np.pi/self.beam['L'])**2*self.beam['E']*self.I_z # about z-axis SIMPEL UNDERSTØTTET
        
        
        soejlekurve = 'c'       
        if 'RH' in self.profile:
            soejlekurve = 'a'
        
        
        if soejlekurve == 'c':
            alpha = 0.49
        elif soejlekurve == 'a':
            alpha = 0.21
            
        f_y = self.f_y_flange
        
        A = self.A
        
        gamma_M1 = self.gamma_M1
        
        Lambda = np.sqrt(A*f_y/N_cr) # For klasse 1, 2 og 3
        
        Phi = 0.5*(1+alpha*(Lambda-0.2)+Lambda**2)
        
        chi = np.min([1/(Phi + np.sqrt(Phi**2 - Lambda**2)), 1])
        
        N_bRd = chi*A*f_y/gamma_M1 # For klasse 1, 2 og 3
                  
        if np.min(self.F1) >= 0:
            N_Ed = 0
        else:
            N_Ed = np.abs(np.min(self.F1))
            
        self.UR_Tryk631 = N_Ed/N_bRd
        self.UR['Tryk - DS/EN 1993-1-1 6.3.1'] = self.UR_Tryk631
        
        if (Lambda <= 0.2) or (N_Ed/N_cr <= 0.04):
            aaa=1
            #'Bjælkenavn: ' + str(self.beam['membername']) + ' - UR tryk: ' + str('lambda <= 0.2 eller N_Ed/N_cr <= 0.04 og der kan ses bort fra søjlevirkning'))
        else:
            aaa=2
            #'Bjælkenavn: ' + str(self.beam['membername']) + ' - UR tryk: ' + str(self.UR_Tryk631))
            
        self.soejletilfaelde = soejletilfaelde
        self.soejlekurve = soejlekurve
        self.alpha = alpha
        self.Lambda = Lambda
        self.N_cr = N_cr
        self.chi = chi
        self.N_bRd = N_bRd
        self.N_Ed = N_Ed
        
        
    #TODO: TRÆKPAVIRKEDE ELEMENTER MED KONSTANT TVÆRSNIT

    def lokaleTvaergaaendeKraefter617(self):
        f_y = self.f_y_krop*10**-6
        r = self.r*1000
        h = self.h*1000
        t = self.d*1000 #krop
        self.Ss = 100 # vederlags længde i mm
        self.phi = 90
        gamma_M1 = self.gamma_M1

        self.h_w = h-t

        self.k=f_y/228
        self.k1 = 1.33 - 0.33*self.k
        self.k2 = 1.15-0.15*r/t
        if self.k2 < 0.5:
            self.k2 = 0.5
        elif self.k2 > 1:
            self.k2 = 1
            
        self.k3 = 0.7 + 0.3*(self.phi/90)**2
        self.k4 = 1.22-0.22*self.k
        self.k5 = 1.06-0.06*r/t
        if self.k5 > 1:
            self.k5 = 1

        if self.Ss/t <= 60:
            self.R_wRd = (self.k1*self.k2*self.k3*(5.92-(self.h_w/t)/132)*(1+0.01*(self.Ss/t))*t**2*f_y)/gamma_M1 
        elif self.Ss/t > 60:
            self.R_wRd = (self.k1*self.k2*self.k3*(5.92-(self.h_w/t)/132)*(0.71+0.015*(self.Ss/t))*t**2*f_y)/gamma_M1

        self.R = np.max(np.abs(self.F2))       

        self.UR_lokaleTvaergaaendeKraefter617 = self.R/self.R_wRd
        self.UR['Lokale tværgående kræfter - DS/EN 1993-1-3 6.1.7'] = self.UR_lokaleTvaergaaendeKraefter617
    
        if self.UR_lokaleTvaergaaendeKraefter617 > 1:
            aaa=1
            #print('KROPSFORSTÆRKNING NØDVENDIG!!!!')
        
    def deformation(self):   

        self.maxAllowable = self.beam['L']/self.deflectionRequirement

        if self.deflectionIsLocal:
            self.max_def = np.max(abs(self.Ve_loc))
        else:
            Ve = self.Ve

            v = np.zeros([len(Ve),2])
            for i, ve in enumerate(Ve):        
                v[i,:] = [np.sqrt(ve[0,0]**2+ve[0,1]**2), np.sqrt(ve[1,0]**2+ve[1,1]**2)]
            
            self.max_def = np.max(v)
            
        self.UR_deformation = self.max_def/self.maxAllowable
        self.UR['Deformation'] = self.UR_deformation
