import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Plot from 'react-plotly.js';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import { saveAs } from 'file-saver';

const steps = ['Date Selection', 'Choose Equipment Type', 'Select Data Types'];

export default function HorizontalLinearStepperData({ onSubmit }) {
  const [activeStep, setActiveStep] = useState(0);
  const [plotData, setPlotData] = useState([]);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    equipmentType: '',
    dataTypes: [] // Updated for multiple data types
  });
  const [dataTypes, setDataTypes] = useState([]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      startDate: '',
      endDate: '',
      equipmentType: '',
      dataTypes: []
    });
    setPlotData([]);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value
    }));

    if (name === 'equipmentType') {
      fetchEquipmentDataTypes(value);
    }
  };

  const fetchEquipmentDataTypes = async (type) => {
    try {
      const response = await fetch(`http://localhost:5003/dataTypes/${type}`);
      const data = await response.json();
      setDataTypes(data);
    } catch (error) {
      console.error("Error fetching data types: ", error);
    }
  };

  const units = {
    "Temperatura del aire HC": "°C",
    "Temperatura del bulbo húmedo": "°C",
    "Punto de Rocío": "°C",
    "Radiación solar": "W/m2",
    "DPV": "kPa",
    "Humedad relativa HC": "%",
    "Precipitación": "mm",
    "Humedad de la hoja": "mín",
    "Velocidad de Viento": "m/s",
    "Ráfagas de Viento": "m/s",
    "Dirección de Viento": "deg",
    "EnviroPro, sensor de humedad del suelo 1": "%",
    "EnviroPro, sensor de humedad del suelo 2": "%",
    "EnviroPro, sensor de humedad del suelo 3": "%",
    "EnviroPro, sensor de humedad del suelo 4": "%",
    "EnviroPro, sensor de humedad del suelo 5": "%",
    "EnviroPro, sensor de humedad del suelo 6": "%",
    "EnviroPro, sensor de humedad del suelo 7": "%",
    "EnviroPro, sensor de humedad del suelo 8": "%",
    "EnviroPro, sensor de temperatura del suelo 1": "°C",
    "EnviroPro, sensor de temperatura del suelo 2": "°C",
    "EnviroPro, sensor de temperatura del suelo 3": "°C",
    "EnviroPro, sensor de temperatura del suelo 4": "°C",
    "EnviroPro, sensor de temperatura del suelo 5": "°C",
    "EnviroPro, sensor de temperatura del suelo 6": "°C",
    "EnviroPro, sensor de temperatura del suelo 7": "°C",
    "EnviroPro, sensor de temperatura del suelo 8": "°C",
    "Panel solar": "mV",
    "Batería": "mV",
    "DeltaT": "°C",
    "Duración del sol": "mín"
  };

  const obtenerUnidad = (tipoDato) => {
    return units[tipoDato] || "";
  };

  const downloadCSV = () => {
    const rows = plotData.flatMap((trace) => {
      return trace.x.map((date, index) => ({
        Date: date.toISOString(),
        Value: trace.y[index],
        Trace: trace.name
      }));
    });

    const csvContent = [
      ['Date', 'Value', 'Trace'], // Headers
      ...rows.map((row) => [row.Date, row.Value, row.Trace])
    ]
      .map((e) => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'data.csv');
  };

  const processPlotData = (data) => {
    const traces = formData.dataTypes.map((dataType) => {
    console.log(dataType)
    const filteredData = data
      .filter((item) => item.measurement === dataType)
      .sort((a, b) => new Date(a.sampling_date) - new Date(b.sampling_date)); // Ordenar por fecha
      console.log(filteredData)
      return {
        type: 'scatter',
        mode: 'lines',
        x: filteredData.map(item => new Date(item.sampling_date)),
        y: filteredData.map(item => item.measurement_value),
        name: `${dataType} (${obtenerUnidad(dataType)})`
      };
    });

    setPlotData(traces);
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:5003/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.equipmentType,
          dataTypes: formData.dataTypes,
          startDate: formData.startDate,
          endDate: formData.endDate
        })
      });

      const result = await response.json();

      if (result && result.data) {
        const data = JSON.parse(result.data);
        console.log(data)
        processPlotData(data);
      }
    } catch (error) {
      console.error("Failed to fetch data: ", error);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <TextField
              label="Start Date"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ margin: 1 }}
            />
            <TextField
              label="End Date"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ margin: 1 }}
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <InputLabel id="equipment-type-label">Equipment Type</InputLabel>
            <Select
              labelId="equipment-type-label"
              id="equipment-type-select"
              value={formData.equipmentType}
              onChange={handleChange}
              name="equipmentType"
              sx={{ width: 200, margin: 1 }}
            >
              <MenuItem value="Sensors">Sensors</MenuItem>
            </Select>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <InputLabel id="data-type-label">Data Types</InputLabel>
            <Select
              labelId="data-type-label"
              id="data-type-select"
              multiple
              value={formData.dataTypes}
              onChange={handleChange}
              name="dataTypes"
              input={<OutlinedInput />}
              renderValue={(selected) => selected.join(', ')}
              sx={{ width: 300, margin: 1 }}
            >
              {dataTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={formData.dataTypes.indexOf(type) > -1} />
                  <ListItemText primary={type} />
                </MenuItem>
              ))}
            </Select>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Stepper activeStep={activeStep} sx={{ width: '80%', marginBottom: 2 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <div>
        {activeStep === steps.length ? (
          <>
            <Typography sx={{ mt: 2, mb: 1 }} />

            <Plot data={plotData} layout={{ title: 'Data Visualization' }} />
            <Button onClick={handleReset}>Reset</Button>
            <Button variant="contained" color="primary" onClick={downloadCSV}>
                Descargar CSV
              </Button>
          </>
        ) : (
          <>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Back
              </Button>
              <Button onClick={() => { if (activeStep === steps.length - 1) fetchData(); handleNext(); }}>
                {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </Box>
          </>
        )}
      </div>
    </Box>
  );
}