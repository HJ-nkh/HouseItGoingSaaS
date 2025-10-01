import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import CardActionButtons from "@/components/card-action-buttons";
import { MaterialType, Member, SteelProfile } from "../lib/types";
import NumberInput from "@/components/number-input";
import Input from "@/components/input";
import { Select } from "@/components/select";

const ModifyMemberCard: React.FC<{
  member: Member;
  onChange: (member: Member) => void;
  onSubmit: (length: number | undefined, member: Member) => void;
  onClose: () => void;
  onDelete?: () => void;
  isVertical?: boolean;
}> = ({ member, onSubmit, onClose, onDelete, isVertical }) => {
  const [name, setName] = useState<string>(member.memberprop?.name || "");
  const [length, _setLength] = useState<number | undefined>();
  const [selectedWoodSize, setSelectedWoodSize] = useState<string>(
    member.memberprop?.woodSizeString || ""
  );
  const [selectedType, setSelectedType] = useState<string>(
    member.memberprop?.type as MaterialType
  );
  const [selectedSteelProfile, setSelectedSteelProfile] = useState<string>(
    member.memberprop?.steelProfile || ""
  );
  const [selectedSteelStrength, setSelectedSteelStrength] = useState<string>(
    (member.memberprop as any)?.steelStrength || ""
  );
  const existingDeflectionRequirement = (member.memberprop as any)?.deflectionRequirement;
  const [deflectionRequirement, setDeflectionRequirement] = useState<number | undefined>(
    existingDeflectionRequirement === undefined
      ? (isVertical ? 300 : 400)
      : existingDeflectionRequirement
  );
  const existingDeflectionIsLocal = (member.memberprop as any)?.deflectionIsLocal;
  const [deflectionIsLocal, setDeflectionIsLocal] = useState<boolean>(
    existingDeflectionIsLocal === undefined
      ? (isVertical ? false : true) // Default: Local (true), unless vertical -> Global (false)
      : !!existingDeflectionIsLocal
  );
  // Wood specific deflection requirements
  const [deflectionFinished, setDeflectionFinished] = useState<number | undefined>(
    (member.memberprop as any)?.deflectionRequirementFinished ?? 400
  );
  const [deflectionInstantSnow, setDeflectionInstantSnow] = useState<number | undefined>(
    (member.memberprop as any)?.deflectionRequirementInstantSnow ?? 400
  );
  const [deflectionInstantWind, setDeflectionInstantWind] = useState<number | undefined>(
    (member.memberprop as any)?.deflectionRequirementInstantWind ?? 250
  );
  const [deflectionInstantLive, setDeflectionInstantLive] = useState<number | undefined>(
    (member.memberprop as any)?.deflectionRequirementInstantLive ?? 400
  );
  const [selectedWoodType, setSelectedWoodType] = useState<string>(
    member.memberprop?.woodType || ""
  );
  const [serviceClass, setServiceClass] = useState<string>(
    (member.memberprop as any)?.serviceClass || ""
  );
  const [selfWeightEnabled, setSelfWeightEnabled] = useState<boolean>(
    (member.memberprop as any)?.selfWeightEnabled ?? true
  );
  const [width, setWidth] = useState<number | null>(
    member.memberprop?.woodSize?.width || null
  );  const [height, setHeight] = useState<number | null>(
    member.memberprop?.woodSize?.height || null
  );

  // Validation logic
  const isFormValid = () => {
    // Type must be selected
    if (!selectedType) return false;
    
    // Steel validation
    if (selectedType === MaterialType.Steel) {
      return !!selectedSteelProfile && !!selectedSteelStrength;
    }
    
    // Wood validation
    if (selectedType === MaterialType.Wood) {
      if (!selectedWoodType) return false;
      
      // Either standard size selected OR custom dimensions provided
      if (selectedWoodSize === "Brugerdefineret") {
        return width !== null && width > 0 && height !== null && height > 0;
      } else {
        return !!selectedWoodSize && selectedWoodSize !== "";
      }
    }
    
    // Masonry - only type selection required
    if (selectedType === MaterialType.Masonry) {
      return true;
    }
    
    return false;
  };

  const materialTypeOptions = [
    { label: "Stål", value: MaterialType.Steel },
    { label: "Træ", value: MaterialType.Wood },
    { label: "Murværk", value: MaterialType.Masonry },
  ];

  const steelProfileOptions = Object.values(SteelProfile).map((profile) => ({
    label: profile,
    value: profile,
  }));

  const steelStrengthOptions = [
    { label: "S235", value: "S235" },
    { label: "S275", value: "S275" },
    { label: "S355", value: "S355" },
    { label: "S420", value: "S420" },
    { label: "S450", value: "S450" },
    { label: "S460", value: "S460" },
  ];

  const woodSizeOptionsC = [
    {
      label: "------ Firhøvlet træ -------",
      value: "------ Firhøvlet træ -------",
    },
    { label: "45 x 45", value: "45 x 45" },
    { label: "45 x 70", value: "45 x 70" },
    { label: "45 x 95", value: "45 x 95" },
    { label: "45 x 120", value: "45 x 120" },
    { label: "45 x 145", value: "45 x 145" },
    { label: "45 x 170", value: "45 x 170" },
    { label: "45 x 195", value: "45 x 195" },
    { label: "45 x 220", value: "45 x 220" },
    { label: "70 x 70", value: "70 x 70" },
    { label: "70 x 145", value: "70 x 145" },
    { label: "70 x 170", value: "70 x 170" },
    { label: "70 x 195", value: "70 x 195" },
    { label: "70 x 220", value: "70 x 220" },
    { label: "95 x 95", value: "95 x 95" },
    { label: "95 x 195", value: "95 x 195" },
    { label: "95 x 220", value: "95 x 220" },
    { label: "120 x 120", value: "120 x 120" },
    { label: "145 x 145", value: "145 x 145" },
    { label: "170 x 170", value: "170 x 170" },
    { label: "195 x 195", value: "195 x 195" },
    {
      label: "------ Savskåret træ -------",
      value: "------ Savskåret træ -------",
    },
    { label: "38 x 73", value: "38 x 73" },
    { label: "50 x 50", value: "50 x 50" },
    { label: "50 x 75", value: "50 x 75" },
    { label: "50 x 100", value: "50 x 100" },
    { label: "50 x 125", value: "50 x 125" },
    { label: "50 x 150", value: "50 x 150" },
    { label: "50 x 175", value: "50 x 175" },
    { label: "50 x 200", value: "50 x 200" },
    { label: "50 x 225", value: "50 x 225" },
    { label: "63 x 125", value: "63 x 125" },
    { label: "75 x 75", value: "75 x 75" },
    { label: "75 x 150", value: "75 x 150" },
    { label: "75 x 175", value: "75 x 175" },
    { label: "75 x 200", value: "75 x 200" },
    { label: "75 x 225", value: "75 x 225" },
    { label: "100 x 100", value: "100 x 100" },
    { label: "100 x 200", value: "100 x 200" },
    { label: "100 x 225", value: "100 x 225" },
    { label: "125 x 125", value: "125 x 125" },
    { label: "150 x 150", value: "150 x 150" },
    { label: "175 x 175", value: "175 x 175" },
    { label: "200 x 200", value: "200 x 200" },
  ];

  const woodSizeOptionsGL = [
    { label: "------ Limtræ -------", value: "------ Limtræ -------" },
    { label: "65 x 100", value: "65 x 100" },
    { label: "90 x 100", value: "90 x 100" },
    { label: "115 x 100", value: "115 x 100" },
    { label: "140 x 100", value: "140 x 100" },
    { label: "160 x 100", value: "160 x 100" },
    { label: "185 x 100", value: "185 x 100" },
  ];

  let woodSizeOptions;

  if (selectedWoodType && selectedWoodType.includes("GL")) {
    woodSizeOptions = woodSizeOptionsGL;
  } else {
    woodSizeOptions = woodSizeOptionsC;
  }

  let dynamicWoodSizeOptions = [...woodSizeOptions];

  // Check if "Brugerdefineret" is the selected value or not included in the current options
  if (
    selectedWoodSize === "Brugerdefineret" ||
    !woodSizeOptions.some((option) => option.value === selectedWoodSize)
  ) {
    // Prepend "Brugerdefineret" to ensure it's at the top
    dynamicWoodSizeOptions = [
      { label: "Brugerdefineret", value: "Brugerdefineret" },
      ...dynamicWoodSizeOptions.filter(
        (option) => option.value !== "Brugerdefineret"
      ), // Remove if already exists to avoid duplication
    ];
  } else {
    // Ensure "Brugerdefineret" is removed if it's not the selected value
    dynamicWoodSizeOptions = dynamicWoodSizeOptions.filter(
      (option) => option.value !== "Brugerdefineret"
    );
  }

  const woodTypeOptions = [
    { label: "C14", value: "C14" },
    { label: "C16", value: "C16" },
    { label: "C18", value: "C18" },
    { label: "C20", value: "C20" },
    { label: "C22", value: "C22" },
    { label: "C24", value: "C24" },
    { label: "C27", value: "C27" },
    { label: "C30", value: "C30" },
    { label: "C35", value: "C35" },
    { label: "C40", value: "C40" },
    { label: "C45", value: "C45" },
    { label: "C50", value: "C50" },
    { label: "D18", value: "D18" },
    { label: "D24", value: "D24" },
    { label: "D30", value: "D30" },
    { label: "D35", value: "D35" },
    { label: "D40", value: "D40" },
    { label: "D50", value: "D50" },
    { label: "D60", value: "D60" },
    { label: "D70", value: "D70" },
    { label: "T200", value: "T200" },
    { label: "T300", value: "T300" },
    { label: "T400", value: "T400" },
    { label: "GL 24h", value: "GL 24h" },
    { label: "GL 28h", value: "GL 28h" },
    { label: "GL 32h", value: "GL 32h" },
    { label: "GL 24c", value: "GL 24c" },
    { label: "GL 28c", value: "GL 28c" },
    { label: "GL 30c", value: "GL 30c" },
    { label: "GL 32c", value: "GL 32c" },
  ];

  const handleWoodSizeChange = (selectedSize: string) => {
    const [selectedWidth, selectedHeight] = selectedSize.split("x").map(Number);
    // Directly set width and height for UI purposes
    setWidth(selectedWidth);
    setHeight(selectedHeight);
    setSelectedWoodSize(selectedSize);
  };

  const handleWoodWidthChange = (value: string) => {
    setWidth(Number(value) || null);
    setSelectedWoodSize("Brugerdefineret");
  };

  const handleWoodHeightChange = (value: string) => {
    setHeight(Number(value) || null);
    setSelectedWoodSize("Brugerdefineret");
  };

  if (!member) {
    return null;
  }
  return (
    <Card className="absolute z-30 w-[22rem] max-w-[90vw]">
      <CardHeader className="mb-2 font-bold">
        Tilpas konstruktionsdel
      </CardHeader>
      <CardContent>
        {/* <div className="flex justify-between items-center gap-2">
          <div className="w-[119px]">Juster længde:</div>
          <NumberInput
            value={length}
            onChange={(l) => setLength(l)}
            unit="m"
            //onEnter={() => onSubmit(length)}
          />
  </div> */}        <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Navn (ID):</div>
          <div className="flex-1 min-w-0">
            <Input
              value={name}
              placeholder="Valgfrit"
              onChange={(n) => {
                setName(n);
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Type:</div>
          <div className="flex-1 min-w-0">
            <Select
                className="w-full min-w-0"
              value={selectedType}
              placeholder="Vælg type"
              onChange={(e) => {
                setSelectedType(e as MaterialType);
              }}
              options={materialTypeOptions}
            />
          </div>
        </div>        {selectedType === MaterialType.Steel && (
          <>
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Styrkeklasse:</div>
            <div className="flex-1 min-w-0">
              <Select
                className="w-full min-w-0"
                value={selectedSteelStrength}
                placeholder="Vælg styrkeklasse"
                onChange={(e) => setSelectedSteelStrength(e as string)}
                options={steelStrengthOptions}
              />
            </div>
          </div>
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Stålprofil:</div>
            <div className="flex-1 min-w-0">
              <Select
                className="w-full min-w-0"
                value={selectedSteelProfile}
                placeholder="Vælg stålprofil"
                onChange={(e) => setSelectedSteelProfile(e as string)}
                options={steelProfileOptions}
              />
            </div>
          </div>
          <div className="my-2 h-px bg-gray-200" />
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Udbøjningskrav:</div>
            <div className="flex-1 min-w-0">
              <NumberInput
                value={deflectionRequirement}
                onChange={(v) => setDeflectionRequirement(v)}
                min={1}
                unit="L/x"
                className="whitespace-nowrap"
              />
            </div>
          </div>
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Udbøjningstype:</div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                role="switch"
                aria-checked={!deflectionIsLocal}
                onClick={() => setDeflectionIsLocal((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !deflectionIsLocal ? "bg-sky-500" : "bg-gray-300"
                }`}
                title="Skift mellem global og lokal udbøjning"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    !deflectionIsLocal ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500 select-none min-w-10">
                {!deflectionIsLocal ? "Global" : "Lokal"}
              </span>
              <div className="relative group">
                <button
                  type="button"
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full border border-gray-300 text-gray-600 text-[10px] bg-white hover:bg-gray-50"
                  aria-label="Hjælp til udbøjningstype"
                  tabIndex={0}
                >
                  i
                </button>
                <div className="hidden group-hover:block absolute left-5 top-0 ml-2 z-50 w-72 max-w-[18rem] p-2 rounded border bg-white shadow-lg text-[12px] leading-snug text-gray-700 whitespace-normal">
                  <p className="mb-1 font-medium">Udbøjningstype</p>
                  <p className="mb-2">Vælg <strong>Global</strong> for eftervisning af samlet udbøjning og flytning af hele konstruktionsdelen, eller <strong>Lokal</strong> for lokal udbøjning af konstruktionsdelen efter flytning.</p>
                  <p className="mb-2">Anbefaling: Brug lokal udbøjning for bjælker og global udbøjning for fastindspændte søjler og fastindspændte udkragede bjælker.</p>
                  <p className="mb-1 font-medium">DKNA:</p>
                  <p className="mb-1 underline">Lodret udbøjning (lokalt):</p>
                  <p className="mb-1">Etageadskillelser: L/400</p>
                  <p className="mb-2">Tage og ydervægge: L/200</p>
                  <p className="mb-1 underline">Vandret udbøjning:</p>
                  <p className="mb-1">Rammer i bygninger uden kraner: L/150</p>
                  <p className="mb-1">Søjler i énetages skeletbygninger: L/300</p>
                  <p>Søjler i fleretages skeletbygninger for hver etage: L/300, for bygningens totale højde: L/500</p>
                </div>
              </div>
            </div>
          </div>
          <div className="my-2 h-px bg-gray-200" />
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Egenvægt:</div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                role="switch"
                aria-checked={selfWeightEnabled}
                onClick={() => setSelfWeightEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  selfWeightEnabled ? "bg-sky-500" : "bg-gray-300"
                }`}
                title="Aktiver/deaktiver egenvægt"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    selfWeightEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500 select-none min-w-8">
                {selfWeightEnabled ? "til" : "fra"}
              </span>
            </div>
          </div>
          </>
        )}        {selectedType === MaterialType.Wood && (
          <>
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Styrkeklasse:</div>
              <div className="flex-1 min-w-0">
                <Select
                  className="w-full min-w-0"
                  value={selectedWoodType}
                  placeholder="Vælg styrkeklasse"
                  onChange={(selectedValue) => {
                    if (typeof selectedValue === "string") {
                      setSelectedWoodType(selectedValue);
                    }
                  }}
                  options={woodTypeOptions}
                />
              </div>
            </div>
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Dimension:</div>
              <div className="flex-1 min-w-0">
                <Select
                  className="w-full min-w-0"
                  value={selectedWoodSize}
                  placeholder="Vælg standarddimension"
                  onChange={(selectedValue) => {
                    if (typeof selectedValue === "string") {
                      handleWoodSizeChange(selectedValue);
                    }
                  }}
                  options={dynamicWoodSizeOptions}
                />
              </div>
            </div>
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Bredde:</div>
              <div className="flex-1 min-w-0">
                <NumberInput
                  value={width ?? undefined}
                  onChange={(value) => {
                    handleWoodWidthChange(String(value));
                  }}
                  unit="mm"
                />
              </div>
            </div>
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Højde:</div>
              <div className="flex-1 min-w-0">
                <NumberInput
                  value={height ?? undefined}
                  onChange={(value) => {
                    handleWoodHeightChange(String(value));
                  }}
                  unit="mm"
                />
              </div>
            </div>
            <div className="my-2 h-px bg-gray-200" />
            <div className="flex gap-3 mb-2 items-start">
              <div className="w-32 text-left flex-shrink-0 mt-1">Anvendelseskl.:</div>
              <div className="flex-1 min-w-0">
                <Select
                  className="w-full min-w-0"
                  value={serviceClass}
                  placeholder="Vælg klasse"
                  onChange={(val) => {
                    if (typeof val === 'string') setServiceClass(val);
                  }}
                  options={[
                    { value: '1', label: (
                      <span>
                        1 - Konstruktioner i opvarmede bygninger, hvor der ikke sker opfugtning af luften, for eksempel boliger, kontorer og forretninger.
                      </span>
                    ) },
                    { value: '2', label: (
                      <span>
                        2 - Konstruktioner i ventilerede, ikke-permanent opvarmede bygninger, for eksempel fritidshuse, uopvarmede garager og lagerbygninger. Ventilerede konstruktioner beskyttet mod nedbør, for eksempel ventilerede tagkonstruktioner.
                      </span>
                    ) },
                    { value: '3', label: (
                      <span>
                        3 - Konstruktioner i fugtige rum konstruktioner udsat for nedbør eller vand i øvrigt, herunder betonforme og udendørsstilladser underlag for tagpaptage, hvis disse ikke udformes, så de kan henføres til anvendelses klasse 2.
                      </span>
                    ) },
                  ]}
                />
              </div>
            </div>
            <div className="my-2 h-px bg-gray-200" />
            <div className="flex gap-3 mb-2 items-start">
              <div className="w-32 text-left flex-shrink-0 mt-1">Udbøjningskrav:</div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <NumberInput
                  value={deflectionFinished}
                  onChange={(v) => setDeflectionFinished(v)}
                  min={1}
                  unit={<span className="flex items-center gap-1"><span><span className="italic">w</span><sub>fin</sub></span> egen, L/x</span>}
                  className="whitespace-nowrap"
                />
                <NumberInput
                  value={deflectionInstantSnow}
                  onChange={(v) => setDeflectionInstantSnow(v)}
                  min={1}
                  unit={<span className="flex items-center gap-1"><span><span className="italic">w</span><sub>inst</sub></span> sne, L/x</span>}
                  className="whitespace-nowrap"
                />
                <NumberInput
                  value={deflectionInstantWind}
                  onChange={(v) => setDeflectionInstantWind(v)}
                  min={1}
                  unit={<span className="flex items-center gap-1"><span><span className="italic">w</span><sub>inst</sub></span> vind, L/x</span>}
                  className="whitespace-nowrap"
                />
                <NumberInput
                  value={deflectionInstantLive}
                  onChange={(v) => setDeflectionInstantLive(v)}
                  min={1}
                  unit={<span className="flex items-center gap-1"><span><span className="italic">w</span><sub>inst</sub></span> nytte, L/x</span>}
                  className="whitespace-nowrap"
                />
              </div>
            </div>
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Udbøjningstype:</div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!deflectionIsLocal}
                  onClick={() => setDeflectionIsLocal((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !deflectionIsLocal ? "bg-sky-500" : "bg-gray-300"
                  }`}
                  title="Skift mellem global og lokal udbøjning"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      !deflectionIsLocal ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 select-none min-w-10">
                  {!deflectionIsLocal ? "Global" : "Lokal"}
                </span>
                <div className="relative group">
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full border border-gray-300 text-gray-600 text-[10px] bg-white hover:bg-gray-50"
                    aria-label="Hjælp til udbøjningstype"
                    tabIndex={0}
                  >
                    i
                  </button>
                  <div className="hidden group-hover:block absolute left-5 top-0 ml-2 z-50 w-72 max-w-[18rem] p-2 rounded border bg-white shadow-lg text-[12px] leading-snug text-gray-700 whitespace-normal">
                    <p className="mb-1 font-medium">Udbøjningstype</p>
                    <p className="mb-2">Vælg <strong>Global</strong> for eftervisning af samlet udbøjning og flytning af hele konstruktionsdelen, eller <strong>Lokal</strong> for lokal udbøjning af konstruktionsdelen efter flytning.</p>
                    <p className="mb-2">Anbefaling: Brug lokal udbøjning for bjælker og global udbøjning for fastindspændte søjler og fastindspændte udkragede bjælker.</p>
                    <p className="mb-1 font-medium"><strong>DKNA:</strong></p>
                    <p className="mb-1"><span className="underline">Tagkonstruktioner</span></p>
                    <p className="mb-1">Konstruktioner uden pilhøjde<span className="italic">w</span><sub>fin</sub>, egenlast: L/400</p>
                    <p className="mb-1">Konstruktioner med pilhøjde<span className="italic">w</span><sub>fin</sub>, egenlast: L/250</p>
                    <p className="mb-1"><span className="italic">w</span><sub>inst</sub>, snelast: L/400</p>
                    <p className="mb-1"><span className="italic">w</span><sub>inst</sub>, vindlast: L/250</p>
                    <p className="mb-1 underline">Bjælkelag</p>
                    <p className="mb-1"><span className="italic">w</span><sub>fin</sub>, egenlast: L/400</p>
                    <p className="mb-1"><span className="italic">w</span><sub>inst</sub>, nyttelast: L/400</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="my-2 h-px bg-gray-200" />
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Egenvægt:</div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={selfWeightEnabled}
                  onClick={() => setSelfWeightEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    selfWeightEnabled ? "bg-sky-500" : "bg-gray-300"
                  }`}
                  title="Aktiver/deaktiver egenvægt"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      selfWeightEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 select-none min-w-8">
                  {selfWeightEnabled ? "til" : "fra"}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>      <CardFooter>
        <CardActionButtons
          submitDisabled={!isFormValid()}
          onSubmit={() => {
            member.memberprop ??= {};

            const updatedMember = {
              ...member,
              memberprop: {
                ...member.memberprop,
                type: selectedType as MaterialType,
                name: name,
                steelProfile: selectedSteelProfile as SteelProfile,
                steelStrength: selectedSteelStrength,
                woodType: selectedWoodType,
                woodSizeString: selectedWoodSize,
                woodSize: {
                  ...member.memberprop.woodSize,
                  width: width === undefined ? null : width,
                  height: height === undefined ? null : height,
                },
                deflectionRequirement: deflectionRequirement,
                deflectionIsLocal: deflectionIsLocal,
                deflectionRequirementFinished: deflectionFinished,
                deflectionRequirementInstantSnow: deflectionInstantSnow,
                deflectionRequirementInstantWind: deflectionInstantWind,
                deflectionRequirementInstantLive: deflectionInstantLive,
                serviceClass: serviceClass,
                selfWeightEnabled: selfWeightEnabled,
              },
            };
            onSubmit(length, updatedMember);
          }}
          onClose={onClose}
          onDelete={onDelete}
        />
      </CardFooter>
    </Card>
  );
};

export default ModifyMemberCard;
