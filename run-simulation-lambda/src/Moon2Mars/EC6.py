# -*- coding: utf-8 -*-
"""
Created on Thu Apr 28 16:23:29 2022

@author: Daniel
"""

import numpy as np
import math
from Moon2Mars.MurProp import MurProp

class EC6():    
    def __init__(self, model, member, project):

        self.beamtype = member['membertype']
        self.beamname = member['membername']
        self.beamprop = member['memberprop']
        self.beam = member
        m = self.beamprop

        Y_max_idx = np.argmax(model.X[model.T[self.beam['consistOfelements']],1])  
        row, col = np.unravel_index(Y_max_idx, model.X[model.T[self.beam['consistOfelements']],1].shape) 

        self.Ned = np.abs(model.F1[row,col])

        self.h = member['L']
        self.hv = member['L']
        self.a1 = m['afstand_kraft']

        self.L = m['l']       
        self.t = m['t']          
        self.A_mur = self.L*self.t    
        self.I = 1/12*self.t**3*self.L
        self.murProp = MurProp()
        
        self.l1 = m['l1']
        self.t1 = m['t1']
        self.l2 = m['l2']
        self.t2 = m['t2']

        self.T = np.zeros((2,2))
        self.T[0,0] = self.l1
        self.T[0,1] = self.t1
        self.T[1,0] = self.l2
        self.T[1,1] = self.t2

        self.murType = m['murtype']
        self.efod = m['efod']
        self.e5 = m['e5']
        self.e0 = m['et']
        self.ned = m['ned']
        self.wed = m['vind']
        self.t_plade = m['t_plade']
        self.l_plade = m['l_plade']
        self.b_plade = m['b_plade']
        
        # Reduktionsfaktor iht. lille tværsnit
        self.reduktion = 1
        if self.A_mur <= 0.1:
            self.reduktion = 0.7 + 0.3*self.A_mur
        print(f'Reduktion = {self.reduktion}')
        print(f'Areal = {self.A_mur}')
        
        self.countPlot = 0
        self.countStabiliserendeVaegge = 0
        
    def getParameterStandardMurvaerk(self):
        murType = self.murType
        # Angiver værdierne for gammelt murværk som er bestemt fra teknologisk institut
        self.fb = self.murProp.getStandard_murvaerk_parametre(murType, 'fb')       # Byggestenstrykstyrke [MPa]
        self.fm = self.murProp.getStandard_murvaerk_parametre(murType, 'fm')       # Mørteltrykstyrke
        self.fk = self.murProp.getStandard_murvaerk_parametre(murType, 'fk')       # Karakteristisk styrke
        self.rho = self.murProp.getStandard_murvaerk_parametre(murType, 'Density')
        self.Gmur = 9.82*self.rho*self.t #Murværkets vægt som funktion af højden. [N/m2]
        #self.fvk0 = self.murProp.getStandard_murvaerk_parametre(self.murType, 'fvk0')   # Karakteristisk forskydningskapacitet.
        self.gamma_c = self.murProp.getStandard_murvaerk_parametre(murType, 'gamma_c')   
        self.ke = self.fm*self.murProp.getStandard_murvaerk_parametre(murType, 'keFactor')   # Ritterkonstanten Styrkeværdi i forhold til https://www.mur-tag.dk/nyhed/nye-styrkevaerdier-til-gammelt-murvaerk/
        self.ke = self.murProp.getStandard_murvaerk_parametre(murType, 'keFactor')
        self.h_skifter = self.murProp.getStandard_murvaerk_parametre(murType, 'højde skifter')
        self.fd = self.fk/self.gamma_c
        print(f'fd = {self.fd}')
    
    def getParameterMurvaerk(self,fb,fm,fmxk1,typeByggesten,Gruppe,Moertel,fugetype,Format):
        if Moertel == 'Normalmørtel' or Moertel == 'Tyndfugemørtel':
            Moertel = 'Normalmørtel og tyndfugemørtel'
        
        # Bestem K-faktoren
        if typeByggesten == 'Tegl':
            if Gruppe == 'Gruppe 1':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Tegl1')
            elif Gruppe == 'Gruppe 2':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Tegl2')
            elif Gruppe == 'Gruppe 3':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Tegl3')
        elif typeByggesten == 'Kalksandsten':
            if Gruppe == 'Gruppe 1':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Kalksandsten1')
            elif Gruppe == 'Gruppe 2':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Kalksandsten2')
            elif Gruppe == 'Gruppe 3':
                print(f'Gruppe 3 eksisterer ikke for {typeByggesten}')
        elif typeByggesten == 'Letklinkerbeton':
            if Gruppe == 'Gruppe 1':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Letklinkerbeton1')
            elif Gruppe == 'Gruppe 2':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Letklinkerbeton2')
            elif Gruppe == 'Gruppe 3':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Letklinkerbeton3')
        elif typeByggesten == 'Porebeton':
            if Gruppe == 'Gruppe 1':
                self.K = self.murProp.getK_Faktor_murvaerk(Moertel,'Porebeton1')
            elif Gruppe == 'Gruppe 2':
                print(f'{Gruppe} eksisterer ikke for {typeByggesten}')
            elif Gruppe == 'Gruppe 3':
                print(f'{Gruppe} eksisterer ikke for {typeByggesten}')
        
        # Bestem trykstyrken, fk.
        if Format == 'Blokke':
            if typeByggesten == 'Letklinkerbeton':
                self.fk = self.murProp.getTrykstyrkeLetklinkerbeton_fk_185(fb)
            elif typeByggesten == 'Porebeton':
                self.fk = self.murProp.getTrykstyrkePorebeton_fk_185(fb)
        elif Format == 'Mursten':
            if Moertel == 'Limfugemørtel' and Gruppe == 'Gruppe 1':
                if typeByggesten == 'Kalksandsten' or typeByggesten == 'Letklinkerbeton' or typeByggesten == 'Porebeton':
                    self.fk = self.K*fb**0.85
                else: 
                    self.fk = self.K*fb**0.7*fm**0.3
            elif Moertel == 'Limfugemørtel' and Gruppe == 'Gruppe 2' or Gruppe == 'Gruppe 3':
                self.fk = self.K*fb**0.7
            else:
                self.fk = self.K*fb**0.7*fm**0.3
        
        
        # Bestem E-modulet
        if typeByggesten == 'Tegl' or typeByggesten == 'Kalksandsten':
            self.ke = min(20*fb,400*fm,1000)
        elif typeByggesten == 'Porebeton':
            self.ke = 450
        elif typeByggesten == 'Letklinkerbeton':
            self.ke = 1000
        print(f'ke = {self.ke}')
        self.E0k = self.ke*self.fk

        # Bøjningstrækstyrkerne
        def interpolation(y2,y1,x2,x1,x):
            slope = (y2-y1)/(x2-x1)
            intersection = y2 - slope*x2
            value = slope*x + intersection
            return value
        
        # self.fmxk1_list = self.murProp.getFmxk1_list()
        # for j in range(0,len(self.fmxk1_list)):
        #     if fmxk1 == self.fmxk1_list[-1]:
        #         self.fxk1 = self.murProp.getBoejningstraekstyrke_fxk1(fb,self.fmxk1_list[-1])
        #     elif fmxk1 >= self.fmxk1_list[j] and fmxk1 < self.fmxk1_list[j+1]:    
        #         self.fxk1 = interpolation(self.murProp.getBoejningstraekstyrke_fxk1(fb,self.fmxk1_list[j+1]), self.murProp.getBoejningstraekstyrke_fxk1(fb,self.fmxk1_list[j]), self.fmxk1_list[j+1], self.fmxk1_list[j], fmxk1)
                
        # self.fxk1_list = self.murProp.getFxk1_list()
        # for j in range(0,len(self.fxk1_list)):
        #     if self.fxk1 >= self.fxk1_list[-1]:
        #         self.fxk2 = self.murProp.getBoejningstraekstyrke_fxk2(fb,self.fxk1_list[-1])
        #     elif self.fxk1 >= self.fxk1_list[j] and self.fxk1 < self.fxk1_list[j+1]:    
        #         self.fxk2 = interpolation(self.murProp.getBoejningstraekstyrke_fxk2(fb,self.fmxk1_list[j+1]), self.murProp.getBoejningstraekstyrke_fxk2(fb,self.fxk1_list[j]), self.fxk1_list[j+1], self.fxk1_list[j], self.fxk1)    
            
        # # Friktion og koæsion
        # if fugetype == 'mørtelfuge (til ugunst)':
        #     self.muk = self.murProp.getFriktionKohæsion(fugetype, 'muk')
        #     self.fvk0 = 2.5*self.fxk1
        # elif fugetype == 'mørtelfuge på fugtspærre':
        #     self.muk = self.murProp.getFriktionKohæsion(fugetype, 'muk')
        #     self.fvk0 = self.murProp.getFriktionKohæsion(fugetype, 'fvk0')
        # elif fugetype == 'mørtelfuge på fugtspærre (til ugunst)':
        #     self.muk = self.murProp.getFriktionKohæsion(fugetype, 'muk')
        #     self.fvk0 = self.murProp.getFriktionKohæsion(fugetype, 'fvk0')
        # elif fm < 0.5:
        #     self.muk = self.murProp.getFriktionKohæsion('mørtelfuge (fm<0.5MPa)', 'muk')
        #     self.fvk0 = self.fxk1
        # elif fm >= 0.5:
        #     self.muk = self.murProp.getFriktionKohæsion('mørtelfuge (fm>=0.5MPa)', 'muk')
        #     self.fvk0 = self.fxk1
        #print(f'fk = {self.fk}')
        # print(f'E0k = {self.E0k}')
        # print(f'fxk1 = {self.fxk1}')
        # print(f'fxk2 = {self.fxk2}')
        # print(f'fvk0 = {self.fvk0}')
        # print(f'muk = {self.muk}')
        # print(f'K = {self.K}')
        # typeByggesten ['Tegl', 'Kalksandsten','Letklinkerbeton','Porebeton']
        # Format ['Mursten','Blokke']
        # Gruppe ['Gruppe 1', 'Gruppe 2', 'Gruppe 3']
        # Moertel ['Normalmørtel','Tyndfugemørtel','Limfugemørtel','Letmørtel (600-800)','Letmørtel (800-1300)']
        # Metode ['Cementerige mørtler (MC)','Kalkrige mørtler (ML)']
        # fugetype ['mørtelfuge (fm<0.5MPa)', 'mørtelfuge (fm>=0.5MPa)',  'mørtelfuge (til ugunst)', 'mørtelfuge på fugtspærre',  'mørtelfuge på fugtspærre (til ugunst)']
    
    def addPlate(self):
        t = self.t_plade
        l = self.l_plade
        b = self.b_plade
        # Tilføj vederlagsplade
        self.t_plade = t                 # Tykkelse plade indsat i mm [m]
        self.b_plade = b                 # Bredde plade indsat i mm [m]
        
        if self.b_plade > self.t:
            print(f'Vederlagspladen kan ikke være breddere end tykkelsen af muren')
        self.l_plade = l                # Længde plade indsat i mm [m]
        self.A_plade = self.l_plade*self.b_plade  # Areal plade [m^2]
    
    def setEffektivHoejde(self):

        self.IA = 1/12*self.L*self.t**3
        self.IV = 1/12*self.T[0,1]*(self.T[0,0])**3
        self.IH = 1/12*self.T[1,1]*(self.T[1,0])**3
        self.IT = self.IV + self.IH
        
        self.inertimomentforhold = self.IT/self.IA
        
        # Beregner effective søjle længde
        p2 = 1                 # Denne faktor kan ændre sig i forhold til understøtningsforholdene i topp og bund Sec 5.5.2.1.
        count = 0
        
        for i in range(0,2):
            if self.T[i,0] > 0:
                count = count + 1
        
        if count == 0:
            self.pn = 1
        elif count == 1:
            if self.h <= 3.5*self.L:
                self.pn = 1/(1+(p2*self.h/(3*self.L))**2)*p2
            elif self.h > 3.5*self.L:
                self.pn = 1.5*self.L/self.h
            if self.pn < 0.3:
                self.pn = 0.3
        elif count == 2:
            if self.h<=1.15*self.L:
                self.pn = 1/(1+(p2*self.h/(self.L))**2)*p2
            elif self.h > 1.15*self.L:
                self.pn = 0.5*self.L/self.h
        
        # Effektiv søjlelængde
        self.hef = self.pn*self.h
        if self.inertimomentforhold < 1:
            self.pn = 1
        elif self.inertimomentforhold > 1 and self.inertimomentforhold < 3:
            reduktion_h = self.h - self.hef
            deltah = reduktion_h*1/2*(self.inertimomentforhold-1)
            self.hef = self.hef + deltah
        
        self.LV = self.T[0,0]
        self.tV = self.T[0,1]
        self.LH = self.T[1,0]
        self.tH = self.T[1,1]
        
        print(f'hef = {self.hef}')
        print(f'IA = {self.IA}')
        print(f'IV = {self.IV}')
        print(f'IH = {self.IH}')
        print(f'IT = {self.IT}')
        print(f'inertimomentforhold = {self.inertimomentforhold}')
        
        self.plotStabiliserendeVaeg()
        
    def setSlankhedForholdet(self):
        # Slankhedsforholdet 
        self.lamMax = 27
        self.lam = self.hef / self.t
        print(f'lam = {self.lam}')
        if self.lam > self.lamMax:
            print(f'Slankhedsforholdet er større end {self.lamMax}. Der skal tages krybning med i beregningerne.')
            
    def setKtFaktor(self):
        # kt-faktoren [-]
        if self.t <= 0.090: 
            self.kt = 0.7
        elif self.t > 0.090:
            self.kt = 0.9
        print(f'kt = {self.kt}')
    
    def setEffektivTykkelse(self,t1,t2,E1,E2):
        ktef = E1/E2
        if ktef > 2:
            ktef = 2
        self.tef = (ktef*t1**3 + t2**3)**(1/3)
    
    def excentricitetRitter(self):
        efod = self.efod
        e5 = self.e5
        e0 = self.e0
        ned = self.ned
        wed = self.wed
        # If no wind, lineload not relevant
        if wed == 0:
            ned = 0
        # Beregning af excetricitet til beregning af lodret belastet væg Ritter.
        ######################## Last forhold #########################################
        gExcen = self.rho*9.82*self.t           # Væggens egenlast som funktion af højden [kN/m^2]
        print(f'gExcen = {gExcen*self.h/2}')
        hFrac1 = 1/3*self.h                              # 1/3 delspunkt af højden
        hFrac2 = 2/3*self.h                              # 2/3 delspunkt af højden
        self.efod = efod
        self.e5 = e5
        self.e0 = e0
        
        ######################## Beregning af regningsmæssig excentricitet
        # Integrationskoordinater langs højden af væggen
        numKoord = 96                         # Antal coordinater. Antallet skal ramme tredjedelspunkterne (2*3,2*6,2*12...2*48).
        deltahx = self.h/numKoord
        hx = np.zeros(numKoord+1)
        for i in range(0,numKoord):
            hx[i+1] = hx[i] + deltahx
        
        # Deformations kurve på baggrund af planhedsafvigelsen. Der antages en parabel. KS!!!!!!
        a5 = -4*e5/self.h**2
        b5 =  4*e5/self.h
        e5Curve = np.zeros(numKoord+1)
        for i in range(0,numKoord):
            e5Curve[i] = (a5*hx[i]**2 + b5*hx[i])*(-1)
        
        # Excentricitets kurve for excentricitet fra horizontal last KS!!!!!!
        Me = np.zeros(numKoord+1)
        for i in range(0,numKoord+1):
            Me[i] = 1/2*wed*hx[i]*(self.h-hx[i])
        print(f'Mmax = {max(Me)}')
        nres = np.zeros(numKoord+1)
        for i in range(0,numKoord+1):
            nres[i] = gExcen*hx[i] + ned

        # Vi skal lige snakke om vi skal have inkluderet momente fra normalkraft og excentricitet.
        ehmCurve = np.zeros(numKoord+1) 
        for i in range(0,numKoord+1):    
            if ned > 0:
                ehmCurve[i] = Me[i]/nres[i]
        
        # Deformations kurve for bund og top excentricitet KS!!!!!
        a0 = (e0 + efod)/self.h
        b0 = -efod
        e0Curve = np.zeros(numKoord+1)
        for i in range(0,numKoord+1):
            e0Curve[i] = a0*hx[i] + b0
            
        # Excentricitet fra last og top og bund KS!!!!!!
        eCurve = ehmCurve + e0Curve

        # Difference mellem planhedsafvigelsen og eCurve KS!!!!!!
        eDiff = eCurve - e5Curve

        # Find placering af den største excentricitet KS!!!!!!
        self.emaxRes = 0
        ndec = 2
        for i in range(0,numKoord+1):
            if round(hx[i],ndec) >= round(hFrac1,ndec) and round(hx[i],ndec) <= round(hFrac2,ndec):
                maximum = max(self.emaxRes,abs(eDiff[i]))
                self.emaxRes = maximum
        count_emax = 0
        for i in range(0,numKoord+1):
            count_emax = count_emax + 1
            if abs(eDiff[i]) == self.emaxRes:
                break
        
        hRes = hx[count_emax-1]
        self.hs = hRes #self.h - hRes
        if self.emaxRes == 0:
            self.hs = self.h/2
        
        # Effektiv tykkelse
        self.teff = self.t - 2*self.emaxRes
        
        # Den designmæssige normallast
        self.nRes = ned + gExcen*(self.h-hRes)
        
        self.e5Curve = e5Curve
        self.eCurve = eCurve
        self.e0 = e0
        self.hx = hx
        self.hFrac1 = hFrac1
        self.hFrac2 = hFrac2
        self.count_emax = count_emax
        
        self.plotExcentricitetRitter()
    
        # define variables for reporting
        self.ned = ned
        
        print(f'emaxres = {self.emaxRes}')
        print(f'hs = {self.hs}')
    
    def excentricitetEN199611(self,ned,wed,etop_max,etop_min,ebund_max,ebund_min):
        ######## Excentricitetsintervaller til beregning af bæreevne for EN 1996-1-1
        # Tjekker om excentricitetsintervallet ligger inde for grænserne i forhold til tykkelsen.
        if self.t/2 < etop_max:
            print(f'{self.t/2} < {etop_max}. emax_top skal være mindre end t/2={self.t/2}.')
        elif self.t/2 < abs(etop_min):
            print(f'{self.t/2} < {etop_min}. emin_top skal være mindre end t/2={self.t/2}.')
        elif self.t/2 < ebund_max:
            print(f'{self.t/2} < {ebund_max}. emax_top skal være mindre end t/2={self.t/2}.')
        elif self.t/2 < abs(etop_min):
            print(f'{self.t/2} < {ebund_min}. emin_top skal være mindre end t/2={self.t/2}.')
          
        # Beregningspunkter ([top, midt, bund]).
        hoejde = [0, self.h/2, self.h]
        
        # Regningsmæssig normalkraft ([top, midt, bund]) [kN/m]
        Ned = [ned, ned+self.Gmur*hoejde[1], ned + self.Gmur*hoejde[2]]
        
        self.fd = 2.85 # Skal slettes igen når det hele er oppe at køre.
        
        # Minimal trykzonebredde 
        tc_min = [Ned[0]/self.fd, Ned[1]/self.fd, Ned[2]/self.fd]
        
        # Excentricitets kurve for excentricitet fra horizontal last KS!!!!!!
        numKoord = 10 #96
        deltahx = self.h/numKoord
        hx = np.zeros(numKoord+1)
        for i in range(0,numKoord):
            hx[i+1] = hx[i] + deltahx
        Me = np.zeros(numKoord+1)
        for i in range(0,numKoord+1):
            Me[i] = 1/2*wed*hx[i]*(self.h-hx[i])

        nres = np.zeros(numKoord+1)
        for i in range(0,numKoord+1):
            nres[i] = self.Gmur*hx[i] + ned
            
        # Tykkelse af trykbuen
        tc = np.zeros(numKoord+1)
        for i in range(0,numKoord+1):
            tc[i] = nres[i]/self.fd

        # Vi skal lige snakke om vi skal have inkluderet momente fra normalkraft og excentricitet.
        ehmCurve = np.zeros(numKoord+1) 
        for i in range(0,numKoord+1):    
            if ned > 0:
                ehmCurve[i] = Me[i]/nres[i]
        # Excentricitet i forhold til konstruktionsimperfektioner. Det skal være effektiv højde og tykkelse. Den skal lige opdateres lidt.
        einit = self.h/450
        
        # Excentricitet i forhold til krybning. Forholdet skal være mellem effektiv højde og tykkelse. Normal tykkelse skal være i kvadratrodsformlen.
        phi_inf = 1.0
        ehm = max(ehmCurve)
        ek = 0.002*phi_inf *self.h/self.t*math.sqrt(self.t*ehm) #Krybning
        
        # Excentriciteten i midten af væggen
        e5 = einit + ek
        
        # Designmæssigt excentricitetsinterval
        edtop_max = etop_max-einit
        edtop_min = etop_min+einit
        edbund_max = ebund_max-einit
        edbund_min = ebund_min+einit
        
        # Bredde af trykbue top
        #a0top = hx[-1] - hx[-2] 

        
        # no2 = int(T[el,1])
        # X1 = X[no1,:]
        # X2 = X[no2,:]
        # a0 = X2 - X1
        # L[el] = math.sqrt(np.matmul(a0,a0))
        # n0 = a0/L[el]
        
        
        # Deformations kurve på baggrund af planhedsafvigelsen. Der antages en parabel. KS!!!!!!
        a5 = -4*e5/self.h**2
        b5 =  4*e5/self.h
        e5Curve = np.zeros(numKoord+1)
        for i in range(0,numKoord):
            e5Curve[i] = (a5*hx[i]**2 + b5*hx[i])*(-1)
        
        
        # Til plot af tryk buen. Tykkelsen er sat til den størrelsen som der er ved 
        # Deformations kurve for bund og top excentricitet KS!!!!!
        beta = np.zeros(numKoord)
        deltax = np.zeros(numKoord)
        tc_hor = np.zeros(numKoord+1)
        for i in range(0,numKoord):
            deltax[i] = abs(ehmCurve[i+1]-ehmCurve[i])
            beta[i] = math.atan(deltahx/deltax[i])
            tc_hor[i] = tc[i]/math.sin(beta[i])
        deltax[-1] = abs(ehmCurve[-1]-ehmCurve[-2])
        beta[-1] = math.atan(deltahx/deltax[-1])
        tc_hor[-1] = tc[-1]/math.sin(beta[-1])
        print(f'deltax = {deltax}')
        print(f'beta = {beta}')
        print(f'tc = {tc}')
        print(f'tc_hor = {tc_hor}')
        print(f'hx = {hx}')
        print(f'hx[-1]-hx[-2] = {hx[-1]-hx[-2]}')
        print(f'ehmCurveDiff = {ehmCurve[1]-ehmCurve[0]}')
        print(f'diff- = {(ehmCurve-tc/2)} ')
        print(f'diff+ = {(ehmCurve+tc/2)} ')
        print(f'append = {len(ehmCurve)}')
        print(f'len(ehmCurve) = {len(ehmCurve)}')
        print(f'len(tc) = {len(tc)}')
        
        
    def linjelastVægRitter(self,fxk1):
        ################### Koordinater til N-M-diagram ########################## 
        # Antal koordinater
        num = 26
        et = np.linspace(self.t/2,0,num)
        #et = [54, 45, 41, 40, 38, 36, 34, 32, 31, 29, 27, 25, 23, 22, 20, 18, 16, 14, 13, 11, 9, 7, 5, 4, 2, 0]
        
        # Definer matricer
        Ac = np.zeros(num)     # Trykareal [m^2]
        Ic = np.zeros(num)     # Inertimoment [m^4]
        ic = np.zeros(num)     # Inertiradius [m]
        bc = np.zeros(num)     # Bredden af trykzonen [m]
        ks = np.zeros(num)     # ks-faktor [-]
        nrd = np.zeros(num)    # Trykstyrken af murværk [kN/m]
        mrd = np.zeros(num)    # Bøjningskapaciteten [kNm/m]
        
        self.setEffektivHoejde(self.T)
        self.setSlankhedForholdet()
        self.setKtFaktor()
        
        #Værdier brugt til verificering##################
        self.fk = 4.56/1.6
        self.ke = 658
        # Beregning af trykstyrken og moment kapaciteten. KS!
        if self.lam < self.lamMax:
            for i in range(0,num):
                bc[i] = self.t - 2 * et[i]
                Ac[i] = self.L * bc[i]
                Ic[i] = 1/12*self.L * bc[i]**3
            for j in range(0,num-1):
                ic[j+1] = math.sqrt(Ic[j+1]/Ac[j+1]) 
                ks[j+1] = 1 / (1 + 1/(self.ke*math.pi**2)*(self.hef/ic[j+1])**2)
                nrd[j+1] = ks[j+1] * self.kt * self.fk * bc[j+1]
                mrd[j+1] = nrd[j+1] * et[j+1]
        
        # Design moment
        med = self.nRes*self.emaxRes
        
        if fxk1 > 0:
            # Beregn punktet A på N-M diagrammet. KS!
            Ax = 0
            Ay = 1/6*fxk1*(self.t)**2
        
            # Beregn punkt D på N-M diagrammet (Se teknisk ståbi for beregning). KS!
            # Hældningen på grafen fra 0 til punktet D
            a0D = self.t/6
            count = 0
            for i in range(0,num-1):
                count = count + i
                anm = (mrd[i+1] - mrd[i]) / (nrd[i+1]-nrd[i])
                bnm = mrd[i] - anm*nrd[i]
                Dx = bnm/(a0D - anm)
                if Dx > nrd[i] and Dx < nrd[i+1]:
                    Dy = anm*Dx + bnm
                    break 

            # Beregn punkt B på N-M-diagrammet (Se teknisk ståbi for beregning)
            aAD = (Dy-Ay)/(Dx-Ax)
            count1 = 0
            for i in range(0,num-1):
                count1 = count1 + i
                anm = (mrd[i+1] - mrd[i]) / (nrd[i+1]-nrd[i])
                bnm = mrd[i] - anm*nrd[i]
                Bx = (bnm-Ay)/(aAD - anm)
                if Bx > nrd[i] and Bx < nrd[i+1]:
                    By = anm*Bx + bnm
                    break 
        
            # Udnyttelsesgraden
            for i in range(0,num-1):
                if self.nRes <= Bx:
                    anm = (By-Ay)/(Bx)
                    Mrd = anm*self.nRes+Ay
                    print(f'Mrd = {Mrd}')
                elif self.nRes >= nrd[i] and self.nRes <= nrd[i+1]:
                    anm = (mrd[i+1] - mrd[i]) / (nrd[i+1]-nrd[i])
                    bnm = mrd[i] - anm*nrd[i]
                    Mrd = anm*self.nRes + bnm
        else:
            # Udnyttelsesgrad 
            for i in range(0,num-1):
                if self.nRes >= nrd[i] and self.nRes <= nrd[i+1]:
                    anm = (mrd[i+1] - mrd[i]) / (nrd[i+1]-nrd[i])
                    bnm = mrd[i] - anm*nrd[i]
                    Mrd = anm*self.nRes + bnm
        U = med/Mrd
        
        print(f'U = {U}')

    def murskive(self,N,W,e0,eL):
        self.fvko = 0.21           # Karakteristisk kohæsion i vægfelt
        self.muk = 1.0             # Karakteristisk friktionskoefficient vægfelt
        self.fvkobund = 0.00       # Karakteristisk kohæsion ved bund
        self.mukbund = 0.40        # Karakteristisk friktionskoefficient bund
        
        self.gamma_kohaesion = 1.7
        self.gamma_friktion = 1.3
        
        self.fvdo = self.fvko/self.gamma_kohaesion
        self.mud = self.muk/self.gamma_friktion
        self.fvdobund = self.fvkobund/self.gamma_kohaesion
        self.mudbund = self.mukbund/self.gamma_friktion
        
        self.rho = 1800
        self.fk = 15
        self.km = 0.07
        
        s = 2 # gennemgående studsfuger pr. 2 skifte
        studsfuger = 2.4 #[kn]
        
        Qber = self.km*self.fk*self.t*self.h*(1-1/s)*0.825
        
        
    def koncentreretLastOmmuring(self,Ned):
        vinkel = 60*math.pi/180
        
        # Trykkapaciteten af gammelt murværk [MPa]
        fd = 2.4/1.84
        
        # Minimums spændingslængde
        Lmin = Ned/(fd*self.b_plade)
        
        # Minimums dybde af spændingszone, h. 
        hmin = (Lmin-self.l_plade)*math.tan(vinkel)
        print(f'hmin = {hmin}')
    
    def murbinder(self, binderlængde, diameter, differensbevaegelse, typeBindere, krumningstype): 
        # Partialkoefficienter
        self.gamma_fy_bindere = self.murProp.getPartialkoefficienterBindere('Flydespænding')
        self.gamma_E0k_bindere = self.murProp.getPartialkoefficienterBindere('E-modul')
        self.gamma_forankring_bindere = self.murProp.getPartialkoefficienterBindere('Forankring')
        
        # Karakteristiske parametre bindere
        self.fyk_binder = self.murProp.getParametreBindere(typeBindere,'Flydespænding') # MPa
        self.E0k_binder = self.murProp.getParametreBindere(typeBindere,'E-modul')
        self.Forank_mur = 1440            # Den værdier skal hentes fra parametre murværk
        self.Forankring_letbeton = 600        # Den værdier skal hentes fra parametre murværk
        
        # Design værdierne bindere
        self.fyd_binder = self.fyk_binder/self.gamma_fy_bindere
        self.E0d_binder = self.E0k_binder/self.gamma_E0k_bindere
        self.F_forankring_d_mur = self.Forank_mur/self.gamma_forankring_bindere
        
        # Geometriske parametre
        self.A_binder = math.pi*diameter**2/4
        self.I_binder = math.pi/64*diameter**4
        
        # Bæreevne
        self.TRd_binder = self.A_binder*self.fyd_binder
        self.P_euler_binder = math.pi**2*self.E0d_binder*self.I_binder/(0.5*binderlængde)**2
        
        
        print(f'A = {self.A_binder}')
        print(f'I = {self.I_binder}')
        print(f'TRd = {self.TRd_binder}')
        print(f'P_euler_binder = {self.P_euler_binder}')
        print(f'fyd = {self.fyd_binder}')
        print(f'E0d = {self.E0d_binder}')
        
                
#afstand_kraft = 0
# rho = 535
# Ned = 14.17#65.3 #84.7 #kN
# ned = 0#58.04 #77 #kN/m


# rho = 1800      
# efod = 0
# e5 = 10
# et = 0

# h = 2700
# hv = h-200
# l = 1990
# t = 330
# l_plade = 160

# Ned = 44.17
# ned = 8.20
# afstand_kraft = 660


# Ned = 65 #kN
# ned = 15 #kN/m
# afstand_kraft = 200


# T1[0,0] = 0
# T1[0,1] = 0
# T1[1,0] = 0
# T1[1,1] = 0

# etop_max = 50
# etop_min = -50
# ebund_max = 50
# ebund_min = -50

# ['Tegl', 'Kalksandsten','Letklinkerbeton','Porebeton']
# Moertel ['Normalmørtel','Tyndfugemørtel','Limfugemørtel','Letmørtel med densitet mellem 600-800 kg/m3', 'Letmørtel med densitet mellem 800-1300 kg/m3']
# fugetype ['mørtelfuge (fm<0.5MPa)', 'mørtelfuge (fm>=0.5MPa)',  'mørtelfuge (til ugunst)', 'mørtelfuge på fugtspærre',  'mørtelfuge på fugtspærre (til ugunst)']

# typeByggesten = 'Tegl'
# Gruppe = 'Gruppe 2'
# Moertel = 'Normalmørtel'
# fugetype = 'mørtelfuge (fm>0.5MPa)'
# Format = 'Mursten'

# #### Bindere
# # typeBindere = 'Tinbronze 720'             #['Rustfast stål', 'Tinbronze 720', 'Tinbronze 480']
# # Krumningstype = 'Bøjet'                  #['Bøjet', 'Krum']


# mur = EC6(h,l,t,rho)  
# mur.getParameterMurvaerk(15, 4.5, 0.15, typeByggesten, Gruppe, Moertel, fugetype, Format)
#mur.getParameterGammeltMurvaerk()  
#mur.excentricitetRitter(efod, e5, et, ned, 0.5)   
#mur.addPlate(10, l_plade, 150)
#mur.excentricitetEN199611(ned,0.5,etop_max,etop_min,ebund_max,ebund_min)       
#mur.koncentreretLastRitter(Ned,ned,T1,hv,afstand_kraft)        
#mur.koncentreretLast(Ned,hv,afstand_kraft)
#mur.linjelastVægRitter(0.21/1.7,T1)
#mur.linjelastVægRitter(0,T1)
#mur.getParameterMurvaerk(15, 7, 0.25, typeByggesten, Gruppe, Moertel, fugetype, Format)
#mur.murbinder(0.192,0.004,0.004,typeBindere, Krumningstype)



#anders.lodretBelastetMuretVægMedVindRitter(ned, 0, T)



# Anders 
# h = 2700
# hv = h-160
# t = 228
# l = 2300  #400
# afstand_kraft = 0

# K = 0.45
# fb = 25
# fm = 0.9
# fk1 = 0.45*fb**0.7*fm**0.3
# fd1 = fk1/1.7

# fk1 = 1.28
# E0k = 1
# rho = 1800

# T1 = np.zeros((2,2))
# T1[0,0] = 0
# T1[0,1] = 0
# T1[1,0] = 1000
# T1[1,1] = 160

# efod = 0
# e5 = 10
# et = 0

# Ned = 77.4
# ned = 66.9

# anders = EC6(h,l,t,fk1,E0k,rho)         
# anders.addPlate(10, 300, t)       
# anders.excentricitet(efod, e5, et, 0, 0)
# #anders.lodretBelastetMuretVægMedVindRitter(ned, 0, T)
# anders.koncentreretLastRitter(Ned,ned,T1,hv,afstand_kraft)        
# anders.koncentreretLast(Ned,hv,afstand_kraft)


#ke = 150 for gammelt murværk
#ke = 360 for nyt murværk



# Murværk nummer 2
#l2 = 1000
#T2 = np.zeros((2,2))
#T2[0,0] = 0
#T2[0,1] = 0 
#T2[1,0] = 0
#T2[1,1] = 0
#anders2 = anders = EC6(h,l2,t,fk,E0k,rho)
#anders2.addPlate(10, 200, t)       
#anders2.excentricitet(efod, e5, et, 0, 0)
#anders.lodretBelastetMuretVægMedVindRitter(ned, 0, T)
#anders2.koncentreretLastRitter(Ned,ned,T2,hv,afstand_kraft)        
#anders2.koncentreretLast(Ned,hv,afstand_kraft)

        
 
# Olivia
#h = 2800
#L = 6000
#t = 160
#fk = 1.28
#E0k = 355
#fxk1 = 0 #0.28
#rho = 1800
#ned = 50 #56.8  #[kN/m]
#wed = 0
#e5 = 10
#e0 = 0
#efod = 0  
#num = 26 
#Ned = 65.3   #[kN]  
#T = np.array([[0,0],
#    [0,0]])  
#olivia = EC6(h,L,t,fk,E0k,rho)         
#olivia.addPlate(10, 200, t)       
#olivia.excentricitet(efod, e5, e0, ned, wed)
#olivia.lodretBelastetMuretVægMedVindRitter(ned,fxk1,T)
#olivia.koncentreretLastRitter(Ned,ned,T,1000)        
#olivia.koncentreretLast(Ned,1000)      
#mur1 = EC6(h, L, t, fk, E0k, fxk1, rho, ned, wed, e5, e0, efod, num)
#mur1.addPlate(10, 200, 150)
#mur1.koncentreretLast(10, 1000)
#mur1.lodretBelastetMuretVægMedVindRitter(T)
#mur1.koncentreretLastOmmuring(Ned)


#mur1.reduktionsFaktorForSlankhedOgExcentricitet('full')

#mur2 = EC6(b,10,L,I)

        
#t = 228        
#h = 2600
#L = 450
#bv = 200
#T = np.zeros((2,2))    

#Katrine = EC6(h,L,t,1.28,355,1800)         
#Katrine.addPlate(10, 200, t)       
#Katrine.excentricitet(0, 10, 0, 0, 0)
#Katrine.lodretBelastetMuretVægMedVindRitter(ned, 0, T)
#Katrine.koncentreretLastRitter(43.1,39.2,T,2000,0)        
#Katrine.koncentreretLast(43.1,2000,0)



# V_d = 6776

# f_vk = 3.4*10**6

# tau_d = 3*V_d/(2*b*h)






#maxDisp = 5/384*((1885+1500)*0.83*L**4)/(11*10**9*I)


