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
  windDirection: number;
};

type WindCalculatorCardProps = {
  settings: WindCalculatorSettings;
  onSettingsChange: (settings: Partial<WindCalculatorSettings>) => void;
  onClose: () => void;
};

const WindCalculatorCard: React.FC<WindCalculatorCardProps> = ({
  settings,
  onSettingsChange,
  onClose,
}) => {
  // State for new construction components
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [constructionLines, setConstructionLines] = useState<Array<{ id: number; x1: number; y1: number; x2: number; y2: number }>>([
    { id: 1, x1: 0, y1: 0, x2: 0, y2: 3 },
    { id: 2, x1: 0, y1: 3, x2: 3, y2: 4 },
    { id: 3, x1: 3, y1: 4, x2: 6, y2: 3 },
    { id: 4, x1: 6, y1: 3, x2: 6, y2: 0 },
  ]);

  const updateSetting = (key: keyof WindCalculatorSettings, value: any) => {
    onSettingsChange({ [key]: value });
  };

  const onEnter = () => {
    // No specific action needed for enter key in wind calculator
  };

  return (
    <Card 
      className="fixed z-30" 
      style={{ 
        width: '1600px',
        maxHeight: '1000px',
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
        {/* Main layout: settings on left, compass in middle, wind zones on right */}
        <div className="flex gap-6">
          {/* Left side: Settings (narrower) */}
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
          
          {/* Middle: Compass view and House Model */}
          <div className="w-80 space-y-2 flex flex-col">
            {/* Compass view */}
            <div className="h-48 w-full">
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
            {/* House rotation angle display */}
            <div className="text-center">
              <div className="inline-block bg-blue-50 px-2 py-1 rounded border text-xs font-medium text-gray-700">
                Hus vinkel: {Math.round(settings.houseRotation)}°
              </div>
            </div>
            {/* 3D House Model - positioned to align with bottom of wind zones */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="h-40 w-full border rounded bg-gray-50">
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
          </div>
          
          {/* Right side: Wind zones */}
          <div className="flex-1 space-y-2">
            {/* Wind zones section */}
            <div className="grid grid-cols-1 gap-2">
              {/* Construction Window */}
              <div className="bg-white rounded-lg border p-2">
                <h4 className="font-medium mb-2 text-center text-xs">Konstruktionslinjer</h4>
                <div className="scale-75 origin-top">
                  <ConstructionWindow
                    selectedLineId={selectedLineId}
                    onLineSelect={setSelectedLineId}
                    onLinesChange={setConstructionLines}
                  />
                </div>
              </div>
              
              {/* Interactive Rectangle */}
              <div className="bg-white rounded-lg border p-2">
                <h4 className="font-medium mb-2 text-center text-xs">Interaktiv vindzoner</h4>
                <div className="scale-75 origin-top">
                  <InteractiveRectangle
                    depth={settings.houseDepth ?? 6}
                    width={settings.houseWidth ?? 10}
                    selectedLineId={selectedLineId}
                    constructionLines={constructionLines}
                    onDotPlaced={(dot: any) => {
                      console.log('Dot placed:', dot);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Luk
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default WindCalculatorCard;
