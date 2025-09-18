import matplotlib.pyplot as plt
import numpy as np
from numpy.linalg import multi_dot

#Plots
def TOPplots(model, ax):
    X = model.X
    T = model.T
    U = model.U
    bL = model.bL
    D = model.D
    
    ndofn = model.ndofn
    nno = np.size(X,0)
    nel = np.size(T,0)
    
    #plot = plt.figure(1)
    #plt.clf()
    #ax = plot.add_subplot(1, 1, 1)
    for el in range(0,nel):
        ax.plot([X[int(T[el,0]),0],X[int(T[el,1]),0]], [X[int(T[el,0]),1],X[int(T[el,1]),1]],color = 'b')
        xp = (X[int(T[el,1]),:] + X[int(T[el,0]),:])/2
        plt.text(xp[0], xp[1] , f'{el}', color = 'black')
    for no in range(0,nno):
        plt.text(X[no,0], X[no,1], f'{no}', color='black', 
        bbox=dict(facecolor='white', edgecolor='grey', boxstyle='round,pad=1'))
    for nbc in U:
        no = int(nbc/3)
        if nbc%3 == 0:
            ax.plot(X[no,0], X[no,1], marker=5, markersize=45, color='blue') 
        elif nbc%3 == 1:  
            ax.plot(X[no,0], X[no,1], marker=6, markersize=45, color='blue')
        elif nbc%3 == 2:  
            ax.plot(X[no,0], X[no,1], marker="s", markersize=40, color='blue')
            
    dx=ax.get_xlim()[1]-ax.get_xlim()[0]
    dy=ax.get_ylim()[1]-ax.get_ylim()[0]
    
    if len(bL) != 0:
        maxLoad = max(abs(bL[:,1]))
        
    nd = np.max(D)    
    R = np.zeros(int(nd)+1)
    nbL = np.size(model.bL,0)
    for i in range(0,nbL):
        d = bL[i,0]
        R[int(d)] = R[int(d)] + bL[i,1]
    
    # if len(bL) != 0:
    #     for dof in range(R.size):
    #         no = int(dof/3)
    #         load = R[dof]           
    #         L_arrow = load/maxLoad
    #         L_arrow = L_arrow-np.sign(L_arrow)*0.25
    #         if load != 0:
    #             if dof%3 == 0:               
    #                 plt.arrow(X[no,0]-L_arrow, X[no,1], L_arrow, 0,width=0.01,head_width=0.1)
    #                 #plt.annotate("", xy=(X[no,0], X[no,1]), xytext=(X[no,0]-load/abs(maxLoad), X[no,1]), arrowprops=dict(arrowstyle="->"))
    #             elif dof%3 == 1:
    #                 plt.arrow(X[no,0], X[no,1]-L_arrow, 0, L_arrow,width=0.01,head_width=0.1)
    #                 #plt.annotate("", xy=(X[no,0], X[no,1]), xytext=(X[no,0], X[no,1]-load/abs(maxLoad)), arrowprops=dict(arrowstyle="->"))
    #             elif dof%3 == 2:
    #                 a=1#plt.annotate("", xy=(X[no,0], X[no,1]), xytext=(0, 0), arrowprops=dict(arrowstyle="->"))
        
    
    # for dof, load in bL:
    #     no = int(dof/3)
    #     if dof%3 == 0:               
    #         plt.arrow(X[no,0], X[no,1], load/abs(maxLoad)*dx/5, 0,width=0.01,head_width=0.05)
    #         #plt.annotate("", xy=(X[no,0], X[no,1]), xytext=(X[no,0]-load/abs(maxLoad), X[no,1]), arrowprops=dict(arrowstyle="->"))
    #     elif dof%3 == 1:
    #         plt.arrow(X[no,0], X[no,1], 0, load/abs(maxLoad)*dy/5,width=0.01,head_width=0.05)
    #         #plt.annotate("", xy=(X[no,0], X[no,1]), xytext=(X[no,0], X[no,1]-load/abs(maxLoad)), arrowprops=dict(arrowstyle="->"))
    #     elif dof%3 == 2:
    #         a=1#plt.annotate("", xy=(X[no,0], X[no,1]), xytext=(0, 0), arrowprops=dict(arrowstyle="->"))
    
    if dx < 2:
        ax.set_xlim(ax.get_xlim()[0]-1,ax.get_xlim()[1]+1)
    if dy < 2:
        ax.set_ylim((ax.get_ylim()[0]-1,ax.get_ylim()[1]+1))
        
        
    ax.set_title("Element Topology")
    ax.set_aspect('equal', adjustable='box')
    
    #plt.show()
    #plt.draw()
    
def DEFplot(model,ax,s):
    X = model.X
    T = model.T
    D = model.D
    V = model.V
    nel = model.nel
    scale = 10
    Ve = s.loadCombinationsFE['Ve']['Snelast dominerende']
    
    #DEFplot = plt.figure(1)
    #ax = DEFplot.add_subplot(1, 1, 1)
    #plt.clf()
    for el in range(0,nel):
        ax.plot([X[int(T[el,0]),0],X[int(T[el,1]),0]], [X[int(T[el,0]),1],X[int(T[el,1]),1]],'--',color = 'black')

    for el in range(0,nel):
        #Create transformation matrix
        no1 = int(T[el,0])
        no2 = int(T[el,1])
        X1 = X[no1,:]
        X2 = X[no2,:]
        Ae = model.Abeam(X1,X2)
        A = Ae[0]
        L = Ae[1]
        Au = np.zeros((2,2))
        for i in range(0,2):
            for j in range(0,2):
                Au[i][j] = A[i][j]
        #Get local deformations
        # v = np.zeros(6)
        # for i in range(0,6):
        #     v[i] = V[int(D[el,i])]
        v = Ve[el,:]
        #Coordinates plus deformations
        nrp = 11
        Xs = np.zeros((2,nrp))
        for i in range(0,nrp):
            s = (i+1-1)/(nrp-1)
            N = [[1-s, 0, 0, s, 0, 0],
                [0, 1 - 3 * s**2 + 2 * s**3, (s-2*s**2+s**3)*L, 0, 3*s**2-2*s**3, (-s**2+s**3)*L]]
            Xs[:,i] = np.transpose(X[int(T[el,0]),:])*(1-s) + np.transpose(X[int(T[el,1]),:])*s + scale*np.dot(np.transpose(Au),np.dot(N,np.dot(A, v)))
        ax.plot(Xs[0,:], Xs[1,:],color = 'b')
        
    ax.axis('equal')
    ax.margins(0.05,0.05) 
    ax.set_title("Deformation")
    ax.set_aspect('equal', adjustable='box')

    
def Splot(model,X,T,nel,S,s,dL,scale):
    if s == 1:
        sf = 'Normal Force'
    elif s == 2:
        sf = 'Shear force'
    elif s ==3:
        sf = 'Moment'
    else:
        sf = 'Numse'
    Splot = plt.figure(3)
    ax = Splot.add_subplot(1, 1, 1)
    for el in range(0,nel):
        plt.plot([X[int(T[el,0]),0],X[int(T[el,1]),0]], [X[int(T[el,0]),1],X[int(T[el,1]),1]],color = 'black')
        a0 = X[int(T[el,1]),:] - X[int(T[el,0]),:]
        L = math.sqrt(np.matmul(a0,a0))
        n = a0/L
        F1 = np.array([-n[1], n[0]])*S[el,0]*scale
        F2 = np.array([-n[1], n[0]])*S[el,1]*scale
        x1 = X[int(T[el,0]),0]
        x2 = X[int(T[el,1]),0]
        y1 = X[int(T[el,0]),1]
        y2 = X[int(T[el,1]),1]
        xm = (x1+x2)/2-n[1]*L/15
        ym = (y1+y2)/2+n[0]*L/15
        plt.plot(xm,ym,"+")
        if s ==3:
            p = dL[el,1]
            m = -p*L**2/2
            np1 = 9
            Xp = np.zeros(np1 +4)
            Yp = np.zeros(np1+4)
            Xp[0] = x1
            Xp[1] = x1 + F1[0]
            Yp[0] = y1
            Yp[1] = y1 + F1[1]
            Xp[np1+3] = x2
            Xp[np1+2] = x2 + F2[0]
            Yp[np1+3] = y2
            Yp[np1+2] = y2 + F2[1]
            for i in range(0,np1):
                x = (i+1)/(np1+1)
                mx = m*x*(1-x)
                ml = np.array([-n[1], n[0]])*mx*scale
                Xp[i+2] = Xp[1] + (i+1)*(Xp[np1+2] - Xp[1])/(np1+1) + ml[0]
                Yp[i+2] = Yp[1] + (i+1)*(Yp[np1+2] - Yp[1])/(np1+1) + ml[1]
        else:
            Xp = [x1, x1+F1[0], x2 + F2[0], x2]
            Yp = [y1, y1+F1[1], y2 + F2[1], y2]
        plt.plot(Xp, Yp,color = 'b')
        #print(F1)
    ax.set_title(sf)
    ax.set_aspect('equal', adjustable='box')
    plt.show()
    
