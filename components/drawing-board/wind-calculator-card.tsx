import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import NumberInput from "../number-input";
import { Select } from "@/components/select";
import HouseOutline from "../house-outline";
import HouseCompassView from "../house-compass-view";
import ConstructionWindow from "../construction-window";
import InteractiveRectangle from "../interactive-rectangle";
import { calculateWindLoads } from "./lib/wind-calculations";

const RoofTypeOptions = [
  { label: "Fladt tag", value: "flat" },
  { label: "Pulttag", value: "monopitch" },
  { label: "Sadeltag", value: "duopitch" },
  { label: "Valmtag", value: "hipped" },
];

const FlatRoofEdgeTypeOptions = [
  { label: "Skarp", value: "sharp" },
  { label: "Med brystninger", value: "parapet" },
  { label: "Afrundet", value: "rounded" },
  { label: "Afskåret", value: "beveled" },
];

const DistanceToSeaOptions = [
  { label: "Mere end 25km", value: "more_than_25km" },
  { label: "Mindre end 25km", value: "less_than_25km" },
];

const TerrainCategoryOptions = [
  { label: "0 - Hav, kystområde udsat for åbent hav", value: "0", selectedLabel: "0 - Hav, kystområde..." },
  { label: "1 - Søer eller fladt og vandret område uden væsentlig vegetation og uden forhindringer", value: "1", selectedLabel: "1 - Søer eller fladt område..." },
  { label: "2 - Område med lav vegetation som fx græs og enkelte forhindringer (træer, bygninger) med indbyrdes afstande på mindst 20 gange forhindringens højde", value: "2", selectedLabel: "2 - Lav vegetation..." },
  { label: "3 - Område med regelmæssig vegetation eller bebyggelse eller med enkeltvise forhindringer med afstande på højst 20 gange forhindringens højde (som fx landsbyer, forstadsområder, permanent skov)", value: "3", selectedLabel: "3 - Regelmæssig vegetation..." },
  { label: "4 - Område, hvor mindst 15 % af overfladen er dækket med bygninger, hvis gennemsnitshøjde er over 15 m.", value: "4", selectedLabel: "4 - Område med bygninger..." },
];

const FormFactorOptions = [
  { label: "Bygningers overordnede bærende konstruktion", value: "main_structure", selectedLabel: "Hovedkonstruktion" },
  { label: "Små elementer og fastgørelser", value: "small_elements", selectedLabel: "Små elementer" },
];

type WindCalculatorSettings = {
  houseHeight?: number;
  houseWidth?: number;
  houseDepth?: number;
  houseRotation: number;
  roofType: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  flatRoofEdgeType: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  distanceToSea: 'more_than_25km' | 'less_than_25km';
  terrainCategory: '0' | '1' | '2' | '3' | '4';
  formFactor: 'main_structure' | 'small_elements';
  // Wind calculator construction elements and load area
  selectedLineId?: number | null;
  lastopland?: number;
  terrainHeight?: number;
  constructionDots?: Array<{
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left';
    progress: number;
    lineId: number;
  }>;
  constructionLines?: Array<{
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left' | 'inside';
    progress: number;
    lineId: number;
    length: number;
    rotation: number;
  }>;
};

type WindCalculatorCardProps = {
  settings: WindCalculatorSettings;
  onSettingsChange: (settings: Partial<WindCalculatorSettings>) => void;
  onClose: () => void;
  drawingBoardLines?: Array<{ id: number; x1: number; y1: number; x2: number; y2: number }>; // Add construction lines from drawing board
};

const WindCalculatorCard: React.FC<WindCalculatorCardProps> = ({
  settings,
  onSettingsChange,
  onClose,
  drawingBoardLines = [], // Default to empty array
}) => {
  // State for new construction components - initialize from saved settings
  const [selectedLineId, setSelectedLineId] = useState<number | null>(settings.selectedLineId ?? null);
  const [lastopland, setLastopland] = useState<number>(settings.lastopland ?? 1.0);
  const [constructionDots, setConstructionDots] = useState(settings.constructionDots ?? []);
  const [constructionLines, setConstructionLines] = useState(settings.constructionLines ?? []);
  const [terrainHeight, setTerrainHeight] = useState<number>(settings.terrainHeight ?? 0);
  
  // Use construction lines from drawing board instead of local state
  const constructionLinesFromBoard = drawingBoardLines;

  const updateSetting = (key: keyof WindCalculatorSettings, value: any) => {
    onSettingsChange({ [key]: value });
  };

  // Save construction elements to settings when they change
  const saveConstructionElements = () => {
    onSettingsChange({
      selectedLineId,
      lastopland,
      terrainHeight,
      constructionDots,
      constructionLines,
    });
  };

  // Find the lowest construction element (dot or line end point)
  const findLowestConstructionElement = () => {
    const allPoints: Array<{ x: number; y: number; type: 'dot' | 'line' }> = [];
    
    // Add all dots
    constructionDots.forEach(dot => {
      allPoints.push({ x: dot.x, y: dot.y, type: 'dot' });
    });
    
    // Add all line end points (both start and end)
    constructionLines.forEach(line => {
      // Add start point
      allPoints.push({ x: line.x, y: line.y, type: 'line' });
      
      // Calculate end point based on length and rotation
      const isVertical = line.rotation === 90 || line.rotation === 270;
      if (isVertical) {
        // Vertical line
        const endY = line.rotation === 90 ? line.y + line.length : line.y - line.length;
        allPoints.push({ x: line.x, y: endY, type: 'line' });
      } else {
        // Horizontal line
        const endX = line.rotation === 0 ? line.x + line.length : line.x - line.length;
        allPoints.push({ x: endX, y: line.y, type: 'line' });
      }
    });
    
    if (allPoints.length === 0) return null;
    
    // Find the point with the highest y value (lowest on screen, since y=0 is top)
    const maxY = Math.max(...allPoints.map(p => p.y));
    const lowestPoints = allPoints.filter(p => p.y === maxY);
    
    // If multiple points at same y level, find the leftmost (smallest x)
    const minX = Math.min(...lowestPoints.map(p => p.x));
    const lowestLeftmostPoint = lowestPoints.find(p => p.x === minX);
    
    return lowestLeftmostPoint;
  };

  // Validation function
  const validateAllFields = () => {
    const errors: string[] = [];
    
    // Check all required form fields
    if (!settings.houseHeight || settings.houseHeight <= 0) {
      errors.push('Hus højde skal være større end 0');
    }
    if (!settings.houseWidth || settings.houseWidth <= 0) {
      errors.push('Hus bredde skal være større end 0');
    }
    if (!settings.houseDepth || settings.houseDepth <= 0) {
      errors.push('Hus dybde skal være større end 0');
    }
    
    // Roof specific validations
    if (settings.roofType === 'flat' && settings.flatRoofEdgeType === 'parapet' && (!settings.parapetHeight || settings.parapetHeight <= 0)) {
      errors.push('Brystningshøjde skal angives for brystninger');
    }
    if (settings.roofType === 'flat' && settings.flatRoofEdgeType === 'rounded' && (!settings.edgeRadius || settings.edgeRadius <= 0)) {
      errors.push('Radius skal angives for afrundede tagkanter');
    }
    if (settings.roofType === 'flat' && settings.flatRoofEdgeType === 'beveled' && (!settings.bevelAngle || settings.bevelAngle <= 0)) {
      errors.push('Hældning skal angives for afskårne tagkanter');
    }
    if ((settings.roofType === 'monopitch' || settings.roofType === 'duopitch') && (!settings.roofPitch || settings.roofPitch <= 0 || settings.roofPitch > 90)) {
      errors.push('Taghældning skal være mellem 0 og 90 grader');
    }
    if (settings.roofType === 'hipped') {
      if (!settings.hippedMainPitch || settings.hippedMainPitch <= 0 || settings.hippedMainPitch > 90) {
        errors.push('Hovedhældning skal være mellem 0 og 90 grader for valmtag');
      }
      if (!settings.hippedHipPitch || settings.hippedHipPitch <= 0 || settings.hippedHipPitch > 90) {
        errors.push('Valmhældning skal være mellem 0 og 90 grader for valmtag');
      }
    }
    
    // Check that at least one construction element is placed
    const hasConstructionElements = constructionDots.length > 0 || constructionLines.length > 0;
    if (!hasConstructionElements) {
      errors.push('Mindst én konstruktionsdel (prik eller linje) skal placeres i Interactive Rectangle');
    }
    
    return errors;
  };

  const validationErrors = validateAllFields();
  const canApplyLoads = validationErrors.length === 0;

  const handleApplyLoads = () => {
    if (canApplyLoads) {
      // Save all current state to settings
      saveConstructionElements();
      
      // Calculate wind loads with the new 4-side approach
      const windCalculationInputs = {
        houseHeight: settings.houseHeight!,
        houseWidth: settings.houseWidth!,
        houseDepth: settings.houseDepth!,
        roofType: settings.roofType,
        roofPitch: settings.roofPitch,
        hippedMainPitch: settings.hippedMainPitch,
        hippedHipPitch: settings.hippedHipPitch,
        flatRoofEdgeType: settings.flatRoofEdgeType,
        parapetHeight: settings.parapetHeight,
        edgeRadius: settings.edgeRadius,
        bevelAngle: settings.bevelAngle,
        distanceToSea: settings.distanceToSea,
        terrainCategory: settings.terrainCategory,
        formFactor: settings.formFactor,
        houseRotation: settings.houseRotation,
      };
      
      console.log('=== PÅFØR LASTER - STARTER VINDBEREGNING ===');
      console.log('Vindberegningsindstillinger:', windCalculationInputs);
      console.log('Konstruktionselementer:', {
        selectedLineId,
        lastopland,
        constructionDots,
        constructionLines,
        terrainHeight,
      });
      
      try {
        // Actually perform the wind calculation
        const windResults = calculateWindLoads(windCalculationInputs);
        console.log('=== VINDBEREGNING FULDFØRT ===');
        console.log('Resultater:', windResults);
      } catch (error) {
        console.error('FEJL i vindberegning:', error);
      }
      
      // Close the calculator
      onClose();
    }
  };

  const onEnter = () => {
    // No specific action needed for enter key in wind calculator
  };

  return (
    <Card 
      className="fixed z-30" 
      style={{ 
        width: '1100px',
        height: '90vh',
        maxHeight: '800px',
        overflowY: 'auto',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <CardHeader>
        <span className="font-bold">Vindlastberegner</span>
      </CardHeader>
      <CardContent>
        {/* Split the card horizontally */}
        <div className="space-y-6">
          {/* Upper half: Settings, Compass View, House Outline */}
          <div className="flex gap-6">
            {/* Left: All inputs */}
            <div className="w-80 space-y-3">
              {/* Roof type dropdown */}
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Tagtype:</div>
                <div className="flex-1">
                  <Select
                    className="w-full border rounded text-left"
                    value={settings.roofType}
                    onChange={(value) => {
                      if (!value) return;
                      const newRoofType = value as 'flat' | 'monopitch' | 'duopitch' | 'hipped';
                      updateSetting('roofType', newRoofType);
                    }}
                    options={RoofTypeOptions}
                  />
                </div>
              </div>
          
              {/* Roof pitch dropdown - only show when monopitch is selected */}
              {settings.roofType === 'monopitch' && (
                <div className="flex gap-3 items-center">
                  <div className="w-20 text-left flex-shrink-0 text-sm">Hældning:</div>
                  <div className="flex-1">
                    <NumberInput
                      value={settings.roofPitch}
                      onChange={(value: number | undefined) => updateSetting('roofPitch', value)}
                      unit="°"
                      placeholder="taghældning"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              )}
              
              {/* Roof pitch dropdown - only show when duopitch is selected */}
              {settings.roofType === 'duopitch' && (
                <div className="flex gap-3 items-center">
                  <div className="w-20 text-left flex-shrink-0 text-sm">Hældning:</div>
                  <div className="flex-1">
                    <NumberInput
                      value={settings.roofPitch}
                      onChange={(value: number | undefined) => updateSetting('roofPitch', value)}
                      unit="°"
                      placeholder="taghældning"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              )}
              
              {/* Roof pitch dropdowns - only show when hipped roof is selected */}
              {settings.roofType === 'hipped' && (
                <>
                  <div className="flex gap-3 items-center">
                    <div className="w-20 text-left flex-shrink-0 text-sm">Hældning 1:</div>
                    <div className="flex-1">
                      <NumberInput
                        value={settings.hippedMainPitch}
                        onChange={(value: number | undefined) => updateSetting('hippedMainPitch', value)}
                        unit="°"
                        placeholder="hældning langs facaderne"
                        onEnter={onEnter}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="w-20 text-left flex-shrink-0 text-sm">Hældning 2:</div>
                    <div className="flex-1">
                      <NumberInput
                        value={settings.hippedHipPitch}
                        onChange={(value: number | undefined) => updateSetting('hippedHipPitch', value)}
                        unit="°"
                        placeholder="hældning på valmene"
                        onEnter={onEnter}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Flat roof edge type dropdown - only show when flat roof is selected */}
              {settings.roofType === 'flat' && (
                <div className="flex gap-3 items-center">
                  <div className="w-20 text-left flex-shrink-0 text-sm">Tagkant:</div>
                  <div className="flex-1">
                    <Select
                      className="w-full border rounded text-left"
                      value={settings.flatRoofEdgeType}
                      onChange={(value) => {
                        if (!value) return;
                        const newEdgeType = value as 'sharp' | 'parapet' | 'rounded' | 'beveled';
                        updateSetting('flatRoofEdgeType', newEdgeType);
                      }}
                      options={FlatRoofEdgeTypeOptions}
                    />
                  </div>
                </div>
              )}

              {/* Conditional input based on flat roof edge type */}
              {settings.roofType === 'flat' && settings.flatRoofEdgeType === 'parapet' && (
                <div className="flex gap-3 items-center">
                  <div className="w-20 text-left flex-shrink-0 text-sm">Brystning:</div>
                  <div className="flex-1">
                    <NumberInput
                      value={settings.parapetHeight}
                      onChange={(value: number | undefined) => updateSetting('parapetHeight', value)}
                      unit="m"
                      placeholder="brystningshøjde"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              )}

              {settings.roofType === 'flat' && settings.flatRoofEdgeType === 'rounded' && (
                <div className="flex gap-3 items-center">
                  <div className="w-20 text-left flex-shrink-0 text-sm">Radius:</div>
                  <div className="flex-1">
                    <NumberInput
                      value={settings.edgeRadius}
                      onChange={(value: number | undefined) => updateSetting('edgeRadius', value)}
                      unit="m"
                      placeholder="tagkant radius"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              )}

              {settings.roofType === 'flat' && settings.flatRoofEdgeType === 'beveled' && (
                <div className="flex gap-3 items-center">
                  <div className="w-20 text-left flex-shrink-0 text-sm">Hældning:</div>
                  <div className="flex-1">
                    <NumberInput
                      value={settings.bevelAngle}
                      onChange={(value: number | undefined) => updateSetting('bevelAngle', value)}
                      unit="°"
                      placeholder="tagkant hældning"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Højde:</div>
                <div className="flex-1">
                  <NumberInput
                    value={settings.houseHeight}
                    onChange={(value: number | undefined) => updateSetting('houseHeight', value)}
                    unit="m"
                    placeholder="højde"
                    onEnter={onEnter}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Bredde:</div>
                <div className="flex-1">
                  <NumberInput
                    value={settings.houseWidth}
                    onChange={(value: number | undefined) => updateSetting('houseWidth', value)}
                    unit="m"
                    placeholder="bredde"
                    onEnter={onEnter}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Dybde:</div>
                <div className="flex-1">
                  <NumberInput
                    value={settings.houseDepth}
                    onChange={(value: number | undefined) => updateSetting('houseDepth', value)}
                    unit="m"
                    placeholder="dybde"
                    onEnter={onEnter}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Afst. vest.:</div>
                <div className="flex-1">
                  <Select
                    className="w-full border rounded text-left"
                    value={settings.distanceToSea}
                    onChange={(value) => {
                      if (!value) return;
                      const newDistanceToSea = value as 'more_than_25km' | 'less_than_25km';
                      updateSetting('distanceToSea', newDistanceToSea);
                    }}
                    options={DistanceToSeaOptions}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Terrænkat.:</div>
                <div className="flex-1">
                  <Select
                    className="w-full border rounded text-left"
                    value={settings.terrainCategory}
                    onChange={(value) => {
                      if (!value) return;
                      const newTerrainCategory = value as '0' | '1' | '2' | '3' | '4';
                      updateSetting('terrainCategory', newTerrainCategory);
                    }}
                    options={TerrainCategoryOptions}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Formfakt.:</div>
                <div className="flex-1">
                  <Select
                    className="w-full border rounded text-left"
                    value={settings.formFactor}
                    onChange={(value) => {
                      if (!value) return;
                      const newFormFactor = value as 'main_structure' | 'small_elements';
                      updateSetting('formFactor', newFormFactor);
                    }}
                    options={FormFactorOptions}
                  />
                </div>
              </div>
            </div>
            
            {/* Middle: House Outline */}
            <div className="w-80 flex">
              <div className="w-full border rounded bg-gray-50 flex-1">
                <HouseOutline
                  width={settings.houseWidth ?? 10}
                  height={settings.houseHeight ?? 8}
                  depth={settings.houseDepth ?? 6}
                  roofType={settings.roofType}
                  flatRoofEdgeType={settings.flatRoofEdgeType}
                  parapetHeight={settings.parapetHeight}
                  edgeRadius={settings.edgeRadius}
                  bevelAngle={settings.bevelAngle}
                  roofPitch={settings.roofPitch}
                  hippedMainPitch={settings.hippedMainPitch}
                  hippedHipPitch={settings.hippedHipPitch}
                />
              </div>
            </div>
            {/* Right: Compass view */}
            <div className="w-80 space-y-2 flex flex-col">
              <div className="flex-1 w-full">
                <HouseCompassView
                  width={settings.houseWidth ?? 10}
                  depth={settings.houseDepth ?? 6}
                  height={settings.houseHeight ?? 8}
                  roofType={settings.roofType}
                  flatRoofEdgeType={settings.flatRoofEdgeType}
                  parapetHeight={settings.parapetHeight}
                  edgeRadius={settings.edgeRadius}
                  bevelAngle={settings.bevelAngle}
                  roofPitch={settings.roofPitch}
                  hippedMainPitch={settings.hippedMainPitch}
                  hippedHipPitch={settings.hippedHipPitch}
                  rotation={settings.houseRotation}
                  onRotationChange={(rotation: number) => updateSetting('houseRotation', rotation)}
                />
              </div>
              {/* House rotation input control */}
              <div className="flex gap-3 items-center">
                <div className="w-20 text-left flex-shrink-0 text-sm">Rotation:</div>
                <div className="flex-1 relative">
                  <input
                    id="houseRotation"
                    type="number"
                    min="0"
                    max="360"
                    value={Math.round(settings.houseRotation)}
                    onChange={(e) => updateSetting('houseRotation', Number(e.target.value))}
                    className="w-full px-2 py-1 pr-12 text-sm border rounded bg-background text-foreground"
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">grader</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Horizontal separator line */}
          <div className="border-t border-gray-300"></div>
          
          {/* Lower half: Construction Window and Interactive Rectangle */}
          <div className="flex gap-20 mt-4">
            {/* Left: Construction Window with terrain height indicator */}
            <div className="w-80">
              <ConstructionWindow
                selectedLineId={selectedLineId}
                onLineSelect={(lineId) => {
                  setSelectedLineId(lineId);
                  onSettingsChange({ selectedLineId: lineId });
                }}
                constructionLines={constructionLinesFromBoard}
                showTerrainHeight={constructionDots.length > 0 || constructionLines.length > 0 || constructionLinesFromBoard.length > 0}
                terrainHeight={terrainHeight}
                onTerrainHeightChange={(height) => {
                  setTerrainHeight(height);
                  onSettingsChange({ terrainHeight: height });
                }}
                constructionDots={constructionDots}
                constructionElements={constructionLines}
              />
            </div>
            
            {/* Right: Interactive Rectangle */}
            <div className="w-80">
              <InteractiveRectangle
                depth={settings.houseDepth ?? 6}
                width={settings.houseWidth ?? 10}
                selectedLineId={selectedLineId}
                constructionLines={constructionLinesFromBoard}
                initialDots={constructionDots}
                initialLines={constructionLines}
                rotation={settings.houseRotation}
                onDotPlaced={(dot: any) => {
                  const newDots = [...constructionDots, dot];
                  setConstructionDots(newDots);
                  onSettingsChange({ constructionDots: newDots });
                }}
                onLinePlaced={(line: any) => {
                  const newLines = [...constructionLines, line];
                  setConstructionLines(newLines);
                  onSettingsChange({ constructionLines: newLines });
                }}
                onDotsChanged={(dots: any) => {
                  setConstructionDots(dots);
                  onSettingsChange({ constructionDots: dots });
                }}
                onLinesChanged={(lines: any) => {
                  setConstructionLines(lines);
                  onSettingsChange({ constructionLines: lines });
                }}
              />
            </div>
            
            {/* Third column: Lastopland input and terrain height */}
            <div className="w-40">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Lastopland
                  </label>
                  <NumberInput
                    value={lastopland}
                    onChange={(value) => {
                      const newValue = value ?? 1.0;
                      setLastopland(newValue);
                      onSettingsChange({ lastopland: newValue });
                    }}
                    onEnter={onEnter}
                    unit="m"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-between items-center w-full">
          {/* Validation errors display */}
          <div className="flex-1">
            {validationErrors.length > 0 && (
              <div className="text-red-600 text-sm">
                <p className="font-medium">Følgende felter skal udfyldes:</p>
                <ul className="list-disc list-inside mt-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Luk
            </button>
            <button
              onClick={handleApplyLoads}
              disabled={!canApplyLoads}
              className={`px-4 py-2 rounded transition-colors ${
                canApplyLoads
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Påfør laster
            </button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default WindCalculatorCard;
