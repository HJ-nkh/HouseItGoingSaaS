# -*- coding: utf-8 -*-
"""
Created on Sat Nov 12 19:38:39 2022

@author: danie
"""

import numpy as np
import matplotlib.pyplot as plt
import math

def simple_support(x,y,scale,alpha, ax):
    # Initialiser output
    X, Y, K1, K2 = [], [], [], []   
    
    # Geometri inputs
    bt = 2                            # Halv bredde af trekanten
    h = 3                             # Højden af trekanten
    ds = 0.5                          # Længde til underflade trekant
    r = 0.5                           # Radius cirkel
    c = math.sqrt(bt**2+h**2)
    b1 = r/c*bt
    h1 = b1/bt*h
    X.append(-b1), Y.append(-h1)
    X.append(b1), Y.append(-h1)
    X.append(-bt), Y.append(-h)
    X.append(bt), Y.append(-h)
    X.append(-bt-ds), Y.append(-h)
    X.append(bt+ds), Y.append(-h)
    K1.append(0), K2.append(2)
    K1.append(1), K2.append(3)
    K1.append(4), K2.append(5)
    
    # Definerer striberne
    n = 5
    delta_s = (2*bt+2*ds)/n 
    hs = 2*delta_s
    non = len(X)
    for i in range(n):
        x1, y1 = (-bt-ds) + (i+1)*delta_s, -h
        X.append(x1)
        Y.append(y1)
        K1.append(non+i)
    X.append(-bt-ds)
    Y.append(-h-hs/2)
    K2.append(len(X)-1)
    non = len(X)
    for i in range(n):
        x2, y2 = (-bt-ds) + i*delta_s, -h-hs
        X.append(x2)
        Y.append(y2)
        K2.append(non+i)
    K1.append(len(X))
    X.append(bt+ds)
    Y.append(-h-hs/2)
    
    # Definer cirklen
    nonc = 50
    phi = np.linspace(0,2*math.pi,nonc)
    lenc = len(X)
    for i in range(nonc):
        xc, yc = r*np.cos(phi[i]) , r*np.sin(phi[i]) 
        X.append(xc)
        Y.append(yc)
        if i == nonc - 1:
            K2.append(lenc)
        else:
            K2.append(lenc+i+1)
        K1.append(lenc+i)
    
    # Scale the coordinates
    for i in range(0,len(X)):
        X[i], Y[i] = X[i]*scale, Y[i]*scale
    
    # Rotate the coordinates
    Xt = np.zeros((n,2))
    for i in range(len(X)):
        X[i], Y[i] = X[i]*np.cos(alpha*math.pi/180) - Y[i]*np.sin(alpha*math.pi/180) + x, X[i]*np.sin(alpha*math.pi/180) + Y[i]*np.cos(alpha*math.pi/180) + y
            
    for i in range(len(K1)):
        x1, y1 = X[K1[i]], Y[K1[i]]
        x2, y2 = X[K2[i]], Y[K2[i]]
        ax.fill([x1,x2], [y1,y2],color='white',edgecolor='black',linewidth=0.6)       
    
    return ax

    



def fixed_support(x,y,scale,alpha,ax):
    # Initialiser output
    X, Y, K1, K2 = [], [], [], []   
    bt = 4
    X.append(-bt/2), Y.append(0)
    X.append(bt/2), Y.append(0)
    K1.append(0), K2.append(1)
    
    # Definerer striberne
    n = 5
    delta_s = (bt)/n 
    hs = 2*delta_s
    non = len(X)
    for i in range(n):
        x1, y1 = -bt/2 + (i+1)*delta_s, 0
        X.append(x1)
        Y.append(y1)
        K1.append(non+i)
    X.append(-bt/2)
    Y.append(-hs/2)
    K2.append(len(X)-1)
    non = len(X)
    for i in range(n):
        x2, y2 = -bt/2 + i*delta_s, -hs
        X.append(x2)
        Y.append(y2)
        K2.append(non+i)
    K1.append(len(X))
    X.append(bt/2)
    Y.append(-hs/2)
    
    # Scale the coordinates
    for i in range(0,len(X)):
        X[i], Y[i] = X[i]*scale, Y[i]*scale
    
    # Rotate the coordinates
    Xt = np.zeros((n,2))
    for i in range(len(X)):
        X[i], Y[i] = X[i]*np.cos(alpha*math.pi/180) - Y[i]*np.sin(alpha*math.pi/180) + x, X[i]*np.sin(alpha*math.pi/180) + Y[i]*np.cos(alpha*math.pi/180) + y    
    
    for i in range(len(K1)):
        x1, y1 = X[K1[i]], Y[K1[i]]
        x2, y2 = X[K2[i]], Y[K2[i]]
        ax.fill([x1,x2], [y1,y2],color='white',edgecolor='black',linewidth=0.6)       
    
    return ax

def roller_support(x,y,scale,alpha, ax):
    # Initialiser output
    X, Y, K1, K2 = [], [], [], []   
    
    # Geometri inputs
    bt = 2                            # Halv bredde af trekanten
    h = 3                             # Højden af trekanten
    ds = 0.5                          # Længde til underflade trekant
    r = 0.5                           # Radius cirkel
    d = 2*r                           # Diameter cirkel
    c = math.sqrt(bt**2+h**2)
    b1 = r/c*bt
    h1 = b1/bt*h
    X.append(-b1), Y.append(-h1)
    X.append(b1), Y.append(-h1)
    X.append(-bt), Y.append(-h)
    X.append(bt), Y.append(-h)
    X.append(-bt-ds), Y.append(-h-d)
    X.append(bt+ds), Y.append(-h-d)
    K1.append(0), K2.append(2)
    K1.append(1), K2.append(3)
    K1.append(2), K2.append(3)
    K1.append(4), K2.append(5)
    
    # Definerer striberne
    n = 5
    delta_s = (2*bt+2*ds)/n 
    hs = 2*delta_s
    non = len(X)
    for i in range(n):
        x1, y1 = (-bt-ds) + (i+1)*delta_s, -h-d
        X.append(x1)
        Y.append(y1)
        K1.append(non+i)
    X.append(-bt-ds)
    Y.append(-h-d-hs/2)
    K2.append(len(X)-1)
    non = len(X)
    for i in range(n):
        x2, y2 = (-bt-ds) + i*delta_s, -h-hs-d
        X.append(x2)
        Y.append(y2)
        K2.append(non+i)
    K1.append(len(X))
    X.append(bt+ds)
    Y.append(-h-hs/2-d)
    
    # Definer cirklen
    nonc = 50
    phi = np.linspace(0,2*math.pi,nonc)
    lenc = len(X)
    for i in range(nonc):
        xc, yc = r*np.cos(phi[i]) , r*np.sin(phi[i]) 
        X.append(xc)
        Y.append(yc)
        if i == nonc - 1:
            K2.append(lenc)
        else:
            K2.append(lenc+i+1)
        K1.append(lenc+i)
    
    # Definer rulleskøjter
    phi = np.linspace(0,2*math.pi,nonc)
    lenc = len(X)
    for i in range(nonc):
        xc, yc = r*np.cos(phi[i]) - 1 , r*np.sin(phi[i]) - h-r 
        X.append(xc)
        Y.append(yc)
        if i == nonc - 1:
            K2.append(lenc)
        else:
            K2.append(lenc+i+1)
        K1.append(lenc+i)
    
    lenc = len(X)
    for i in range(nonc):
        xc, yc = r*np.cos(phi[i]) + 1 , r*np.sin(phi[i]) - h-r 
        X.append(xc)
        Y.append(yc)
        if i == nonc - 1:
            K2.append(lenc)
        else:
            K2.append(lenc+i+1)
        K1.append(lenc+i)
    
    # Scale the coordinates
    for i in range(0,len(X)):
        X[i], Y[i] = X[i]*scale, Y[i]*scale
    
    # Rotate the coordinates
    Xt = np.zeros((n,2))
    for i in range(len(X)):
        X[i], Y[i] = X[i]*np.cos(alpha*math.pi/180) - Y[i]*np.sin(alpha*math.pi/180) + x, X[i]*np.sin(alpha*math.pi/180) + Y[i]*np.cos(alpha*math.pi/180) + y
        
    for i in range(len(K1)):
        x1, y1 = X[K1[i]], Y[K1[i]]
        x2, y2 = X[K2[i]], Y[K2[i]]
        ax.fill([x1,x2], [y1,y2],color='white',edgecolor='black',linewidth=0.6)       
    
    return ax


# tissekone = roller_support(0,0,3,0)
# X = tissekone[0]
# Y = tissekone[1]
# K1 = tissekone[2]
# K2 = tissekone[3]

# ax = plt.gca()  # or any other way to get an axis object
# for i in range(len(K1)):
#     x1, y1 = X[K1[i]], Y[K1[i]]
#     x2, y2 = X[K2[i]], Y[K2[i]]
#     ax.fill([x1,x2], [y1,y2],color='white',edgecolor='black')   

# ax.set_aspect('equal', adjustable='box')

#ax.set_aspect('equal', adjustable='box')
# ax.grid(which='both', color='grey', linewidth=1, linestyle='-', alpha=0.2)
# plt.Circle((0, 0), 100, color='r')
# #ax.legend()


# plt.rcParams['text.usetex'] = True


# t = np.linspace(0.0, 1.0, 100)
# s = np.cos(4 * np.pi * t) + 2

# fig, ax = plt.subplots(figsize=(6, 4), tight_layout=True)
# ax.plot(t, s)

# ax.set_xlabel(r'\textbf{time (s)}')
# ax.set_ylabel(r'\\textit{Velocity (\N{DEGREE SIGN}/sec)}', fontsize=16)
# ax.set_title(r'\TeX\ is Number $\displaystyle\sum_{n=1}^\infty'
#               r'\frac{-e^{i\pi}}{2^n}$!', fontsize=16, color='r')