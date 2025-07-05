# -*- coding: utf-8 -*-
"""
Created on Wed Feb  8 15:30:27 2023

@author: Nicolas
"""
import numpy as np

class Wall():
    def __init__(self,model):
        self.model = model
        
        self.h = {}
        self.hv = {}
        self.l = {}
        self.t = {}
        
        self.efod = {}
        self.e5 = {}
        self.et = {}
        
        self.t_plade = {}
        self.l_plade = {}
        self.b_plade = {}
        
        self.l1 = {}
        self.t1 = {}
        self.l2 = {}
        self.t2 = {}
        
        self.T1 = {}
        
        
        self.Ned = {}
        self.ned = {}
        self.afstand_kraft = {}
        self.vind = {}
        
        self.walltype = {}
        
    def addWall(self,coor1,coor2,h,hv,l,t,efod,e5,et,t_plade,b_plade,l_plade,l1,t1,l2,t2,Ned,ned,afstand_kraft,vind,name,walltype):
        
        self.h[name] = h
        self.hv[name] = hv
        self.l[name] = l
        self.t[name] = t
        
        self.efod[name] = efod
        self.e5[name] = e5
        self.et[name] = et
        
        self.t_plade[name] = t_plade
        self.l_plade[name] = l_plade
        self.b_plade[name] = b_plade
        
        self.l1[name] = l1
        self.t1[name] = t1
        self.l2[name] = l2
        self.t2[name] = t2
        
        self.T1[name] = np.zeros((2,2))
        self.T1[name][0,0] = l1
        self.T1[name][0,1] = t1
        self.T1[name][1,0] = l2
        self.T1[name][1,1] = t2
        
        self.Ned[name] = Ned
        self.ned[name] = ned
        self.afstand_kraft[name] = afstand_kraft
        self.vind[name] = vind
        
        self.walltype[name] = walltype
        
        self.model.addBeam(coor1, coor2, t, l, 0.5, name, walltype)
        