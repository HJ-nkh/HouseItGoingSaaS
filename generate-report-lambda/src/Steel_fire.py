# -*- coding: utf-8 -*-
"""
Created on Mon Oct 10 18:11:56 2022

@author: danie
"""

import pandas as pd

#class Steel_fire():
    
#    def __init__(self):
        # Partial factors for resistance, gamma_m

def steeltempfire(ky):
    
    def interpolation(x1,x2,y1,y2,x):
        a = (y2-y1)/(x2-x1)
        b = y1 - a*x1
        yfin = a*x+b
        return yfin
    

    steel_temperature_dataset = {
        'Steel temperature': ['20C', '100C','200C','300C','400C','500C','600C','700C','800C','900C','1000C','1100C','1200C'],
        'temperature': [20,100,200,300,400,500,600,700,800,900,1000,1100,1200],   
        'ky': [1.000, 1.000, 1.000, 1.000, 1.000, 0.780, 0.470, 0.230, 0.110, 0.060, 0.040, 0.020, 0.000 ],
        'kp': [1.000, 1.000, 0.807, 0.613, 0.420, 0.360, 0.180, 0.075, 0.050, 0.0375,0.0250,0.0125,0.0],
        'kE': [1.000, 1.000, 0.900, 0.800, 0.700, 0.600, 0.310, 0.130, 0.090, 0.0675, 0.0450,0.0225,0.000]}
    steel_temperature = pd.DataFrame(steel_temperature_dataset)
    steel_temperature.set_index('Steel temperature', inplace = True)
    
    index_list = list(steel_temperature.index.values)
    temperature = steel_temperature['temperature']
    
    
    for i in range(len(index_list)):
        if ky == steel_temperature['ky'][i]:
            temp = temperature[i]
            break
        
        if ky > steel_temperature['ky'][i]:
            temp = interpolation(steel_temperature['ky'][i],steel_temperature['ky'][i-1],temperature[i],temperature[i-1],ky)
            print(f'temp = {temp}')
            break
    
    return temp
            
