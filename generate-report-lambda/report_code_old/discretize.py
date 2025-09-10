# -*- coding: utf-8 -*-
"""
Created on Sun Dec 17 18:01:30 2023

@author: Nicolas
"""
import numpy as np

def discretize_beam_coordinates(T, X, discretization_factor):
    new_nodes = []
    new_beams = []
    current_node_index = 0

    for beam in T:
        start_node, end_node = beam
        start_coord = X[start_node]
        end_coord = X[end_node]

        # Linear interpolation between start and end coordinates
        for i in range(discretization_factor):
            new_coord = start_coord + (end_coord - start_coord) * i / discretization_factor
            new_nodes.append(new_coord)
            
            if i != 0:
                # Add beam between last two nodes
                new_beams.append([current_node_index - 1, current_node_index])
            current_node_index += 1

        # Ensure the end node of each original beam is included
        new_nodes.append(end_coord)
        new_beams.append([current_node_index - 1, current_node_index])
        current_node_index += 1

    return np.array(new_beams), np.array(new_nodes)

def discretize_moments(M, T, discretization_factor):
    new_moments = []

    for i, moment in enumerate(M):
        start_moment = M[i]
        end_moment = M[T[i][1]] if i < len(M) - 1 else M[i]  # Use next beam's start moment as the end point

        # Linear interpolation of moments
        for j in range(discretization_factor + 1):
            interpolated_moment = start_moment + (end_moment - start_moment) * j / discretization_factor
            new_moments.append(interpolated_moment)

        # Skip adding the end moment again if it's not the last beam
        if i != len(M) - 1:
            new_moments.pop()

    return np.array(new_moments)