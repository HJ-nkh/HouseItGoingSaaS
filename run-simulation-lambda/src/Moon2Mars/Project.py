# -*- coding: utf-8 -*-
"""
Created on Tue Feb  7 19:02:09 2023

@author: Nicolas
"""

class Project():
    def addProjectNumber(self, projectNumber):
        self.projectNumber = projectNumber
    
    def addCC(self,CC):
        self.CC = CC
    
    def selfweightTrueFalse(self,selfweightOnOff):
        self.selfweightOnOff = selfweightOnOff
        
    def addNumberOfLevelsAbove(self,nLevelsAbove):
            self.nLevelsAbove = nLevelsAbove
            
    def robustFactorTrueFalse(self,robustFactorOnOff):
            self.robustFactorOnOff = robustFactorOnOff
            
    def addDeformationCriteriaSteel(self,defCritSteel):
            self.defCritSteel = defCritSteel
            
    def addDeformationCriteriaWood(self,defCritWood1,defCritWood2):
            self.defCritWood1 = defCritWood1
            self.defCritWood2 = defCritWood2