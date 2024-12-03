import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const steps = ['Select Table', 'Upload Data', 'Finish'];

export default function HorizontalLinearStepperImport({ onSubmit }) {
  const [activeStep, setActiveStep] = useState(0);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [file, setFile] = useState(null);

  const handleNext = () => {
    if (activeStep === 1 && file) {
      // Aquí se debería realizar la carga del archivo
      uploadFile();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedTable('');
    setFile(null);
  };

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
  };

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, accept: '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

  const fetchTables = async () => {
    try {
      const response = await fetch('http://localhost:5003/api/tables'); // Endpoint para obtener enfermedades disponibles
      const data = await response.json();
      setTables(data);

      console.log(data)
    } catch (error) {
      console.error("Error fetching tables: ", error);
    }
  };

  useEffect(() => {
    // Cargar las tablas disponibles desde el backend
    fetchTables();
    
  }, []);

  const uploadFile = () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('table', selectedTable);

    axios.post('http://localhost:5003/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(response => {
      console.log('File uploaded successfully', response.data);
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }).catch(error => {
      console.error('Error uploading file', error);
    });
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Select
            value={selectedTable}
            onChange={handleTableChange}
            displayEmpty
            fullWidth
          >
            <MenuItem value="">
            </MenuItem>
            {tables.map((table) => (
              <MenuItem key={table} value={table}>{table}</MenuItem>
            ))}
          </Select>
        );
      case 1:
        return (
          <div {...getRootProps()} style={{ border: '1px solid black', padding: 20, cursor: 'pointer' }}>
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p>Drop the files here ...</p> :
                <p>Drag 'n' drop some files here, or click to select files</p>
            }
          </div>
        );
      case 2:
        return <Typography>All steps completed - you&apos;re finished</Typography>;
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <div>
        {activeStep === steps.length ? (
          <React.Fragment>
                        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>

            <Button onClick={handleReset}>Reset</Button>
            </Box>
          </React.Fragment>
        ) : (
          <React.Fragment>
                        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>

            {getStepContent(activeStep)}
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleNext}>
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
            </Box>
          </React.Fragment>
        )}
      </div>
    </Box>
  );
}