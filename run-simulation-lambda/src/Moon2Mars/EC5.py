# -*- coding: utf-8 -*-
"""
Created on Thu Apr 28 16:23:29 2022

@author: Nicolas
"""

from Moon2Mars.Wood_parameters import WoodProp
import numpy as np
import math

class EC5:
    def __init__(self, selfS, member_discr):
        
        self.project = selfS.project
        self.woodprop = WoodProp()
        self.beam = member_discr
        self.beamname = member_discr['membername']
        self.beamprop = member_discr['memberprop']
        self.beamtype = member_discr['membertype']
        self.strengthclass = self.beamprop['strength class']

        self.T = selfS.T_discr
        self.X = selfS.X_discr
        self.X_loc = selfS.X_loc_discr

        
        # Geometriske parametre
        self.b = self.beamprop['b']
        self.h = self.beamprop['h']
        self.L = member_discr['L']
        self.I = member_discr['I']
        self.A = member_discr['A']
        self.i_gyration = math.sqrt(self.I/self.A) 
        
        self.vederlag_længderetning = 100*10**-3
        
        self.serviceClass = 'Service class 2'
        self.loadDuration = self.getLoadDuration()
        
        if self.serviceClass == 'Service class 1':
            self.anvendelsesklasse = 1
        elif self.serviceClass == 'Service class 2':
            self.anvendelsesklasse = 2
        elif self.serviceClass == 'Service class 3':
            self.anvendelsesklasse = 3   
        
        
        if 'C' in self.strengthclass:   
            self.material = 'Konstruktionstræ'
            self.material1 = 'Solid timber - EN 14081-1'
            self.material2 = 'Solid timber EN 14081-1'
            self.woodType1 = 'Solid timber'
            self.woodType2 = self.strengthclass
            self.state = 'ULS - solid timber, grade stamp individually marked'
        elif 'T' in self.strengthclass:
            self.material = 'Konstruktionstræ'
            self.material1 = 'Solid timber - EN 14081-1'
            self.material2 = 'Solid timber EN 14081-1'
            self.woodType1 = 'Solid timber'
            self.woodType2 = self.strengthclass
            self.state = 'ULS - solid timber, grade stamp individually marked'
        elif 'GL' in self.strengthclass:
            self.material1 = 'Glued-laminated timber - EN 14080'
            self.material2 = 'Glued-laminated timber EN 14080'
            self.woodType1 = 'Glued laminated'
            self.woodType2 = self.strengthclass
            self.state = 'ULS - Glued-laminated timber'
        
        # Studsvaeg
        #self.k_sys = 1.1
        
        self.k_sys = 1.0
        self.k_mod = self.woodprop.getKmod(self.loadDuration, self.material1)
        self.k_def = self.woodprop.getKdef(self.serviceClass, self.material2)
        rektangulaertMassivtTraeLimtraeOgLVL = True
        self.k_m = self.get_k_m(rektangulaertMassivtTraeLimtraeOgLVL)
        #self.k_h = self.get_k_h(self.woodType1) # Den skal defineres hver gang der en eftervisning for bøjning og tryk.
        self.f_mk = self.woodprop.get_f_mk(self.woodType2)
        self.f_t0k = self.woodprop.get_f_t0k(self.woodType2)
        self.f_t90k = self.woodprop.get_f_t90k(self.woodType2)
        self.f_c0k = self.woodprop.get_f_c0k(self.woodType2)
        self.f_c90k = self.woodprop.get_f_c90k(self.woodType2)
        self.f_vk = self.woodprop.get_f_vk(self.woodType2)
        self.E_mean = self.woodprop.getElasticity(self.woodType2)
        self.G_mean = self.woodprop.getShearElasticity(self.woodType2)
        self.E_005k = self.woodprop.getElasticity_E005k(self.woodType2)
        self.rho = self.woodprop.getDensity(self.woodType2)
        
        robustFaktorOn = selfS.project.robustFactorOnOff
        if robustFaktorOn:
            robustFaktor = 1.2
        else:
            robustFaktor = 1
        
        self.gamma_M = self.woodprop.getGammaM(self.state)*robustFaktor

        self.UR = {}
        
    def trykVinkelretPaaFibrene615(self):
        
        f_c90k = self.woodprop.get_f_c90k(self.woodType2)
        
        f_c90d = (self.k_mod*self.k_sys*f_c90k)/self.gamma_M
        
        print(f'f_c90d = {f_c90d}')
        #For elementer på enkeltunderstøtninger, forudsat at "1 ≥ 2h, se figur 6.2b, bør værdien af kc,90 sættes til:
        if self.woodType1 == 'Glued laminated' and self.vederlag_længderetning <= 400*10**-3:
            k_c90 = 1.75
        elif self.woodType1 == 'Solid timber':
            k_c90 = 1.5
            
        # k_c90 = 1
            
        A_ef = (self.vederlag_længderetning + 30*10**-3)*self.b
        
        
        R = max(abs(self.F2[0][0]), abs(self.F2[-1][-1]))
        
        sigma_c90d = R/A_ef
               
        self.UR_trykVinkelretPaaFibrene615 = sigma_c90d/(k_c90*f_c90d)
        self.UR['Tryk vinkelret på fibrene - DS/EN 1995 6.1.5'] = self.UR_trykVinkelretPaaFibrene615
        
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR tryk vinkelret på fibrene: ' + str(self.UR_trykVinkelretPaaFibrene615))
        
        if self.UR_trykVinkelretPaaFibrene615 > 1:
            print('Tjek om styrken kan forøges ved EC5 afsnit 6.1.5 (3) og (4)')
            
    def trykParalleltMedFibrene614(self,printOn):
        
        F1vec = self.F1
        maxIndex = np.unravel_index(np.argmax(np.abs(F1vec), axis=None), F1vec.shape)
        
        if F1vec[maxIndex] > 0:
            self.N_cEd = 0
        else:
            self.N_cEd = np.max(np.abs(F1vec))
        
        A = self.b*self.h
        
        self.sigma_c0d = self.N_cEd/A
        
        self.f_c0d = self.k_mod*self.k_sys*self.f_c0k/self.gamma_M
        
        self.UR_trykParalleltMedFibrene614 = self.sigma_c0d/self.f_c0d
        self.UR['Tryk parallelt med fibrene - DS/EN 1995 6.1.4'] = self.UR_trykParalleltMedFibrene614
        
        if printOn:
            print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR tryk parallelt med fibre (uden buckling): ' + str(self.UR_trykParalleltMedFibrene614))
        
    def traekParalleltMedFibrene612(self,printOn):
        
        F1vec = self.F1
        maxIndex = np.unravel_index(np.argmax(np.abs(F1vec), axis=None), F1vec.shape)
        
        if F1vec[maxIndex] <= 0:
            self.N_tEd = 0
        else:
            self.N_tEd = np.max(np.abs(F1vec))
        
        self.k_ht = self.get_k_h(self.b,self.woodType1)
        
        A = self.b*self.h
        
        self.sigma_t0d = self.N_tEd/A
        
        self.f_t0d = self.k_ht*self.k_mod*self.k_sys*self.f_t0k/self.gamma_M
        
        self.UR_traekParalleltMedFibrene612 = self.sigma_t0d/self.f_t0d
        self.UR['Træk parallelt med fibrene - DS/EN 1995 6.1.2'] = self.UR_traekParalleltMedFibrene612
        
        if printOn:
            print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR træk parallelt med fibre: ' + str(self.UR_traekParalleltMedFibrene612))
        
    def forskydning617(self):
        self.V_Ed = np.max(np.abs(self.F2))
        
        self.k_cr = 1 # altid 1 i DK
        
        self.A_cr = self.k_cr*self.b*self.h
        
        self.tau = 3/2*self.V_Ed/self.A_cr # Der er en fejl i enhederne som skal rettes til. Den giver en for stor spænding
        
        self.f_vd = self.k_mod*self.k_sys*self.f_vk/self.gamma_M

        self.UR_forskydning617 = self.tau/self.f_vd
        self.UR['Forskydning - DS/EN 1995 6.1.7'] = self.UR_forskydning617
        
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR forskydning: ' + str(self.UR_forskydning617))
        
    def boejning616(self, printOn):
        
        self.maxM = np.max(np.abs(self.M))
        
        k_sys = self.k_sys
        
        k_mod = self.k_mod
        k_def = self.k_def
        k_m = self.k_m
        f_mk = self.f_mk
        gamma_M = self.gamma_M
        self.k_hm = self.get_k_h(self.h,self.woodType1)
        
        self.sigma_myd = (self.maxM*(self.h/2))/self.I
        self.f_myd = (k_mod*k_sys*self.k_hm*f_mk)/gamma_M
                    
        UR_boejning611 = self.sigma_myd/self.f_myd #+k_m*sigma_mzd/f_mzd     
        UR_boejning612 = k_m*self.sigma_myd/self.f_myd #+sigma_mzd/f_mzd # Den her skal vist kun regnes når vi har med bøjning om 2 akser. I vores tilfælde har vi kun bøjning om en akse.
        
        self.UR_boejning616 = np.max([UR_boejning611, UR_boejning612])
        self.UR['Bøjning - DS/EN 1995 6.1.6'] = self.UR_boejning616

        if printOn:
            print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR bøjning: ' + str(self.UR_boejning616))
        
    def boejningOgTraek623(self):
        

        self.traekParalleltMedFibrene612(0)
        self.boejning616(0)

        
        self.UR_boejningOgTraek623 = self.UR_traekParalleltMedFibrene612 + self.UR_boejning616
        self.UR['Kombineret bøjning og aksialt træk - DS/EN 1995 6.2.3'] = self.UR_boejningOgTraek623
        
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR bøjning og træk: ' + str(self.UR_boejningOgTraek623))
        
        
    def boejningOgTryk624(self):
        

        self.trykParalleltMedFibrene614(0)
        self.boejning616(0)
        self.UR_boejningOgTryk624 = self.UR_trykParalleltMedFibrene614**2 + self.UR_boejning616
        self.UR['Kombineret bøjning og aksialt tryk - DS/EN 1995 6.2.4'] = self.UR_boejningOgTryk624
        
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR bøjning og tryk: ' + str(self.UR_boejningOgTryk624))
     
    def hulrandsstyrke(self,hulType,d,alpha):
        # Dette afsnit bestemmer hulrandsstyrken iht. Whale et al 1987. En ordentlig reference skal findes, men den står i kursusmateriale fra DTU træ lecture 7.
        if hulType == 'Forborede':
            fh0k = 0.082*(1-0.01*d)*self.rho  #[MPa]
        else:
            if d > 8:
                print('Formlen er ikke gældende for huller større end 8mm')
            else:
                fh0k = 0.082*self.rho*d**(-0.3)
        k90 = 1.35 + 0.015*d
        fhak = fh0k/(k90*math.sin(alpha*math.pi/180)**2 + math.cos(alpha*math.pi/180)**2)
        return fhak
        
    def get_k_m(self,rektangulaertMassivtTraeLimtraeOgLVL):
        if rektangulaertMassivtTraeLimtraeOgLVL:
            k_m = 0.7
        else:
            k_m = 1
        return k_m
        
    def get_k_h(self,h, woodType):        
        # Det kh variere i forhold til hvilken eftervisning der foretages. Det skal vi lige huske at have med.
        if woodType == 'Solid timber':
            # EC5 3.2 (3) k varierer for om det er en trækpåvirket eller bøjnings påvirket del. Det skal programmes sættes op til.
            if h < 150:
                k_h = min((150/h)**0.2, 1.3)
            else:
                k_h = 1
        elif woodType == 'Glued laminated':
            # EC5 3.3 (3)
            if h < 600:
                k_h = min((600/h)**0.1, 1.1)
            else:
                k_h = 1                
        return k_h

    def deformation(self):
        
        Ve = self.Ve

        v = np.zeros([len(Ve),2])
        for i, ve in enumerate(Ve):
            v[i,:] = [np.sqrt(ve[0,0]**2+ve[0,1]**2), np.sqrt(ve[1,0]**2+ve[1,1]**2)]
            
        self.maxV = np.max(v)
        
        E_0 = self.woodprop.getElasticity(self.woodType2)
        G_0 = self.woodprop.getShear(self.woodType2)
             
        forskydningsudbøjningsFaktor = (E_0/G_0)*(self.h/self.L)**2
        
        self.u_inst = self.maxV*(1+forskydningsudbøjningsFaktor)
        
        self.u_fin = self.u_inst*(1+self.k_def)
        
        self.maxDef1 = self.L/self.project.defCritWood1
        self.maxDef2 = self.L/self.project.defCritWood2
        
        self.UR_deformation_inst1 = self.u_inst/self.maxDef1
        self.UR_deformation_inst2 = self.u_inst/self.maxDef2
        self.UR_deformation_fin1 = self.u_fin/self.maxDef1

        self.UR['Deformation, inst L/' + str(self.project.defCritWood1)] = self.UR_deformation_inst1
        self.UR['Deformation, inst L/' + str(self.project.defCritWood2)] = self.UR_deformation_inst2
        self.UR['Deformation, fin L/' + str(self.project.defCritWood1)] = self.UR_deformation_fin1
        
        
        
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - u_inst: ' + str(self.u_inst*1000))
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - u_fin: ' + str(self.u_fin*1000))

        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR deformation_inst' + str(self.project.defCritWood1) + ': ' + str(self.UR_deformation_inst1))
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR deformation_inst' + str(self.project.defCritWood2) + ': ' + str(self.UR_deformation_inst2))
        print('Bjælkenavn: ' + str(self.beam['membername']) + ' - UR deformation_fin' + str(self.project.defCritWood1) + ': ' + str(self.UR_deformation_fin1))
           
    def studsvaeg(self,cc):
        if cc <= 610:
            self.k_sys =1.1
        
    def relativSlankhed632(self,compressionMember,L):
        # Længden (L) til den relative slankhed skal kobles til ramme programmet.
        
        if compressionMember == 'Fastholdt position og retning i begge ender':
            soejlereduktion = 0.7
        elif compressionMember == 'Fastholdt position i begge ender, og i retning i den ene ende':
            soejlereduktion = 0.85
        elif compressionMember == 'Fastholdt position i begge ender, men ikke i retning':
            soejlereduktion = 1.0
        elif compressionMember == 'Fastholdt position og retning i den ene ende, og i retning, men ikke position i den anden ende':
            soejlereduktion = 1.5
        elif compressionMember == 'Fastholdt position og retning i den ene ende, og fri den anden ende':
            soejlereduktion = 2.0
        
        # Effektiv søjlelængde
        self.Le = soejlereduktion*L
        
        # Slankhed
        slankhed = self.Le/self.i_gyration
        
        print(f'slankhed = {slankhed}')
        
        # Relativ slankhed
        self.lambda_rel = slankhed/math.pi*math.sqrt(self.f_c0k/self.E_005k) 
        
    def instabilitetsfaktor_kc632(self):
        # Styrkeparametre
        if 'C' in self.strengthclass: 
            betac = self.woodprop.getImperfection_factor_betac('Solid timber')
        elif 'GL' in self.strengthclass:
            betac = self.woodprop.getImperfection_factor_betac('Glued-laminated')
        
        print(f'betac = {betac}')
        k = 0.5*(1+betac*(self.lambda_rel-0.3)+self.lambda_rel**2)
        self.kc = 1/(k+math.sqrt(k**2-self.lambda_rel**2))
    
    def soejleStabilitet632(self):
        self.boejning616(0)
        self.trykParalleltMedFibrene614(0)
        self.instabilitetsfaktor_kc632()
        
        
        if self.lambda_rel <= 0.3:
            UR = (self.sigma_c0d/(self.f_c0d))**2 + self.UR_boejning616
        else:
            UR = self.sigma_c0d/(self.kc*self.f_c0d) + self.UR_boejning616  
            
        print(f'UR = {UR}')
        

    def getLoadDuration(self):
        # dom = self.dom
        # # Table 2.1
        # if dom == 'Nyttelast dominerende':
        #     return 'Medium term'
        # elif dom == 'Snelast dominerende':
        #     return 'Short term'
        # if dom == 'Vindlast dominerende':
        #     return 'Instantaneous'
        # if dom == 'Kun nyttelaster':
        #     return 'Medium term'
        # if dom == 'Egenlast dominerende':
        #     return 'Permanent'
        # if 'Brand' in dom:
        #     return 'Instantaneous'
        # if dom == 'Karakteristisk' or dom == 'Hyppig' or dom == 'Kvasi-permanent':
        #     return 'Medium term'
        # else:
        return 'Medium term' ### SIKRE DENNE FOR NYE LASTKOMBINATIONER
        
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

        





