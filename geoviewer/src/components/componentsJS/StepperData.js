import React, { useState, useEffect } from 'react';
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

const steps = ['Date Selection', 'Choose Equipment Type', 'Select Data Type'];

export default function HorizontalLinearStepperData({ onSubmit }) {
  const [activeStep, setActiveStep] = useState(0);
  const [plotData, setPlotData] = useState([]);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    equipmentType: '',
    dataType: ''
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
      dataType: ''
    });
    setPlotData([]);
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
    if (event.target.name === 'equipmentType') {
      fetchEquipmentDataTypes(event.target.value);
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

  const processPlotData = (data, category) => {
    console.log(category)
    if(category=="Sensors"){
      const sortedData = data.sort((a, b) => a.sampling_date - b.sampling_date);
      console.log("Sensores")
      const trace = {
        type: 'scatter',
        mode: 'lines',
        x: sortedData.map(item => new Date(item.sampling_date)), // Convierte los milisegundos a objetos Date
        y: sortedData.map(item => item.measurement_value), // Asume que el valor está en 'measurement_value'
        name: formData.dataType, // Utiliza el tipo de dato elegido por el usuario
      };
      console.log(trace)
      setPlotData([trace]);

    }else{
      console.log("Insectos")
      const sortedData = data.sort((a, b) => a.sampling_date - b.sampling_date);
      const trace = {
        type: 'scatter',
        mode: 'lines',
        x: sortedData.map(item => new Date(item.sampling_date)), // Convierte los milisegundos a objetos Date
        y: sortedData.map(item => item.tracked), // Asume que el valor está en 'measurement_value'
        name: formData.dataType, // Utiliza el tipo de dato elegido por el usuario
      };
      console.log(trace)
      setPlotData([trace]);
    }

  };

  const layoutWatsat = {
    title: formData.dataType +' Visualization',
    xaxis: {
      title: 'Date',
      type: 'date'
    },
    yaxis: { title: formData.dataType +' Content' }
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
          dataType: formData.dataType,
          startDate: formData.startDate,
          endDate: formData.endDate
        })
      });
      const result = await response.json();
      console.log(result)
      if (result && result.data) {
        const data = JSON.parse(result.data); // Asegura que 'data' se parsea correctamente si es un string
        console.log(formData.equipmentType)
        processPlotData(data, formData.equipmentType);
      }
        //onSubmit(data); // This function should be defined in the parent component to handle the fetched data
    } catch (error) {
      console.error("Failed to fetch data: ", error);
    }
  };


  useEffect(() => {
    if (formData.equipmentType) {
      fetchEquipmentDataTypes(formData.equipmentType);
    }
  }, [formData.equipmentType]);

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
              <MenuItem value="Cameras">Cameras</MenuItem>
            </Select>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <InputLabel id="data-type-label">Data Type</InputLabel>
            <Select
              labelId="data-type-label"
              id="data-type-select"
              value={formData.dataType}
              onChange={handleChange}
              name="dataType"
              sx={{ width: 200, margin: 1 }}
            >
              {dataTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
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
          <React.Fragment>
            <Typography sx={{ mt: 2, mb: 1 }}>
            </Typography>
            <Button onClick={handleReset}>Reset</Button>
            <Plot data={plotData} layout={layoutWatsat} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Back
              </Button>
              <Button onClick={() => { if (activeStep === steps.length - 1) fetchData(); handleNext(); }}>
                {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </Box>
          </React.Fragment>
        )}
      </div>
    </Box>
  );
}