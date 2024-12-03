import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Plot from 'react-plotly.js';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import { saveAs } from 'file-saver';

const steps = ['Seleccionar fechas', 'Seleccionar enfermedades'];

export default function IllnessModelStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [plotData, setPlotData] = useState([]);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    illnesses: []
  });
  const [availableIllnesses, setAvailableIllnesses] = useState([]);

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
      illnesses: []
    });
    setPlotData([]);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value
    }));
  };

  const fetchIllnesses = async () => {
    try {
      const response = await fetch('http://localhost:5003/available_illnesses'); // Endpoint para obtener enfermedades disponibles
      const data = await response.json();
      setAvailableIllnesses(data.illnesses || []);
    } catch (error) {
      console.error("Error fetching illnesses: ", error);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5003/illness_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          illnesses: formData.illnesses,
          startDate: formData.startDate,
          endDate: formData.endDate
        })
      });

      const result = await response.json();

      if (result && result.data) {
        processPlotData(result.data);
      }
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  const processPlotData = (data) => {
    const traces = data.map((illnessData) => {
      const illnessName = illnessData[0].illness_name;
      if (!illnessName) return [];

      return Object.keys(illnessData[0])
        .filter((key) => key !== 'sampling_date' && key !== 'illness_name') // Excluir claves no relevantes
        .map((variable) => ({
          type: 'scatter',
          mode: 'lines+markers',
          x: illnessData.map(item => new Date(item.sampling_date)),
          y: illnessData.map(item => item[variable]),
          name: `${illnessName} - ${variable.replace(/_/g, ' ')}` // Etiqueta formateada
        }));
    }).flat();

    setPlotData(traces);
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
    saveAs(blob, 'illness_model_data.csv');
  };

  useEffect(() => {
    fetchIllnesses();
  }, []);

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <TextField
              label="Fecha de inicio"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ margin: 1 }}
            />
            <TextField
              label="Fecha de fin"
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
            <InputLabel id="illness-type-label">Seleccionar enfermedades</InputLabel>
            <Select
              labelId="illness-type-label"
              id="illness-select"
              multiple
              value={formData.illnesses}
              onChange={handleChange}
              name="illnesses"
              input={<OutlinedInput />}
              renderValue={(selected) => selected.join(', ')}
              sx={{ width: 300, margin: 1 }}
            >
              {availableIllnesses.map((illness) => (
                <MenuItem key={illness} value={illness}>
                  <Checkbox checked={formData.illnesses.indexOf(illness) > -1} />
                  <ListItemText primary={illness} />
                </MenuItem>
              ))}
            </Select>
          </Box>
        );
      default:
        return 'Paso desconocido';
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
            <Plot data={plotData} layout={{ title: 'Visualización de Enfermedades' }} />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button onClick={handleReset}>Reiniciar</Button>
              <Button variant="contained" color="primary" onClick={downloadCSV}>
                Descargar CSV
              </Button>
            </Box>
          </>
        ) : (
          <>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Atrás
              </Button>
              <Button
                onClick={() => {
                  if (activeStep === steps.length - 1) fetchData();
                  handleNext();
                }}
              >
                {activeStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              </Button>
            </Box>
          </>
        )}
      </div>
    </Box>
  );
}