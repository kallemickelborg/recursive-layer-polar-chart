// React hooks
import { useState, useEffect, useRef } from "react";

// Data
import defaultChartConfig from "../chartData.json";
import * as XLSX from 'xlsx';

const useChartData = () => {
  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem("chartData");
    return savedData ? JSON.parse(savedData) : defaultChartConfig.branches;
  });

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem("chartSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultChartConfig.settings;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dataVersion = useRef(0);

  useEffect(() => {
    localStorage.setItem("chartData", JSON.stringify(data));
    localStorage.setItem("chartSettings", JSON.stringify(settings));
  }, [data, settings]);

  const importFromExcel = async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsBinaryString(file);
      });

      const wb = XLSX.read(result, { type: 'binary' });
      
      const settingsSheet = wb.Sheets["Settings"];
      const branchesSheet = wb.Sheets["Branches"];

      if (!settingsSheet || !branchesSheet) {
        throw new Error("Invalid Excel file format");
      }

      const newSettings = XLSX.utils.sheet_to_json(settingsSheet)[0];
      const branchesData = XLSX.utils.sheet_to_json(branchesSheet);

      // Reconstruct the branches structure
      const newBranches = [];
      branchesData.forEach(row => {
        let branch = newBranches.find(b => b.name === row.BranchName);
        if (!branch) {
          branch = {
            name: row.BranchName,
            color: row.BranchColor,
            flipText: row.BranchFlipText,
            heightAdjustment: row.BranchHeightAdjustment,
            onionLayers: []
          };
          newBranches.push(branch);
        }

        let layer = branch.onionLayers[row.OnionLayerIndex];
        if (!layer) {
          layer = { wedgeLayers: [] };
          branch.onionLayers[row.OnionLayerIndex] = layer;
        }

        let wedge = layer.wedgeLayers[row.WedgeLayerIndex];
        if (!wedge) {
          wedge = { color: row.WedgeColor, labels: [] };
          layer.wedgeLayers[row.WedgeLayerIndex] = wedge;
        }

        wedge.labels[row.LabelIndex] = row.Label;
      });

      // Update state in a single batch
      setSettings(newSettings);
      setData(newBranches);
      dataVersion.current += 1;

      localStorage.setItem("chartSettings", JSON.stringify(newSettings));
      localStorage.setItem("chartData", JSON.stringify(newBranches));

    } catch (error) {
      setError("Error importing Excel file: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings) => {
    setSettings((prevSettings) => ({ ...prevSettings, ...newSettings }));
  };

  const resetToDefaults = () => {
    setData([...defaultChartConfig.branches]);
    setSettings({...defaultChartConfig.settings});
    localStorage.clear();
  };

  const addBranch = () => {
    const newBranch = {
      name: "New Branch",
      color: "#999",
      flipText: false,
      heightAdjustment: 10,
      onionLayers: [
        {
          wedgeLayers: Array(3).fill({
            color: "#999",
            labels: ["New Label"],
          }),
        },
      ],
    };
    setData((prevData) => [...prevData, newBranch]);
  };

  const removeBranch = (branchIndex) => {
    setData((prevData) => prevData.filter((_, index) => index !== branchIndex));
  };

  const handleBranchChange = (branchIndex, key, value) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex ? { ...branch, [key]: value } : branch
      )
    );
  };

  const addOnionLayer = (branchIndex) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: [
                ...branch.onionLayers,
                {
                  wedgeLayers: [
                    { color: "#999", labels: ["New Label"] },
                  ],
                },
              ],
            }
          : branch
      )
    );
  };

  const removeOnionLayer = (branchIndex, layerIndex) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.filter(
                (_, lIndex) => lIndex !== layerIndex
              ),
            }
          : branch
      )
    );
  };

  const addWedgeLayer = (branchIndex, layerIndex) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.map((layer, lIndex) =>
                lIndex === layerIndex
                  ? {
                      ...layer,
                      wedgeLayers: [
                        ...layer.wedgeLayers,
                        { color: "#999", labels: ["New Label"] },
                      ],
                    }
                  : layer
              ),
            }
          : branch
      )
    );
  };

  const removeWedgeLayer = (branchIndex, layerIndex, wedgeIndex) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.map((layer, lIndex) =>
                lIndex === layerIndex
                  ? {
                      ...layer,
                      wedgeLayers: layer.wedgeLayers.filter(
                        (_, wIndex) => wIndex !== wedgeIndex
                      ),
                    }
                  : layer
              ),
            }
          : branch
      )
    );
  };

  const handleWedgeChange = (
    branchIndex,
    layerIndex,
    wedgeIndex,
    key,
    value
  ) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.map((layer, lIndex) =>
                lIndex === layerIndex
                  ? {
                      ...layer,
                      wedgeLayers: layer.wedgeLayers.map((wedge, wIndex) =>
                        wIndex === wedgeIndex
                          ? { ...wedge, [key]: value }
                          : wedge
                      ),
                    }
                  : layer
              ),
            }
          : branch
      )
    );
  };

  const addInitiative = (branchIndex, layerIndex, wedgeIndex) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.map((layer, lIndex) =>
                lIndex === layerIndex
                  ? {
                      ...layer,
                      wedgeLayers: layer.wedgeLayers.map((wedge, wIndex) =>
                        wIndex === wedgeIndex
                          ? {
                              ...wedge,
                              labels: [...wedge.labels, "New Label"],
                            }
                          : wedge
                      ),
                    }
                  : layer
              ),
            }
          : branch
      )
    );
  };

  const removeInitiative = (
    branchIndex,
    layerIndex,
    wedgeIndex,
    initiativeIndex
  ) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.map((layer, lIndex) =>
                lIndex === layerIndex
                  ? {
                      ...layer,
                      wedgeLayers: layer.wedgeLayers.map((wedge, wIndex) =>
                        wIndex === wedgeIndex
                          ? {
                              ...wedge,
                              labels: wedge.labels.filter(
                                (_, iIndex) => iIndex !== initiativeIndex
                              ),
                            }
                          : wedge
                      ),
                    }
                  : layer
              ),
            }
          : branch
      )
    );
  };

  const handleInitiativeChange = (
    branchIndex,
    layerIndex,
    wedgeIndex,
    initiativeIndex,
    value
  ) => {
    setData((prevData) =>
      prevData.map((branch, index) =>
        index === branchIndex
          ? {
              ...branch,
              onionLayers: branch.onionLayers.map((layer, lIndex) =>
                lIndex === layerIndex
                  ? {
                      ...layer,
                      wedgeLayers: layer.wedgeLayers.map((wedge, wIndex) =>
                        wIndex === wedgeIndex
                          ? {
                              ...wedge,
                              labels: wedge.labels.map((label, iIndex) =>
                                iIndex === initiativeIndex ? value : label
                              ),
                            }
                          : wedge
                      ),
                    }
                  : layer
              ),
            }
          : branch
      )
    );
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Convert settings to worksheet
    const settingsWS = XLSX.utils.json_to_sheet([settings]);
    XLSX.utils.book_append_sheet(wb, settingsWS, "Settings");

    // Prepare branches data for Excel
    const branchesData = data.flatMap((branch, branchIndex) => 
      branch.onionLayers.flatMap((layer, layerIndex) =>
        layer.wedgeLayers.flatMap((wedge, wedgeIndex) =>
          wedge.labels.map((label, labelIndex) => ({
            BranchName: branch.name,
            BranchColor: branch.color,
            BranchFlipText: branch.flipText,
            BranchHeightAdjustment: branch.heightAdjustment,
            OnionLayerIndex: layerIndex,
            WedgeLayerIndex: wedgeIndex,
            WedgeColor: wedge.color,
            LabelIndex: labelIndex,
            Label: label
          }))
        )
      )
    );

    // Convert branches data to worksheet
    const branchesWS = XLSX.utils.json_to_sheet(branchesData);
    XLSX.utils.book_append_sheet(wb, branchesWS, "Branches");

    // Save the file
    XLSX.writeFile(wb, "chart_data.xlsx");
  };

  return {
    data,
    settings,
    updateSettings,
    addBranch,
    removeBranch,
    handleBranchChange,
    addOnionLayer,
    removeOnionLayer,
    addWedgeLayer,
    removeWedgeLayer,
    handleWedgeChange,
    addInitiative,
    removeInitiative,
    handleInitiativeChange,
    resetToDefaults,
    exportToExcel,
    importFromExcel,
    isLoading,
    error,
    dataVersion: dataVersion.current,
  };
};

export default useChartData;