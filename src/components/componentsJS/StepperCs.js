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
import { Card, CardContent } from '@mui/material';
import { Backdrop } from '@material-ui/core';

const steps = ['Date Selection', 'Choose Index Type', 'Upload Data'];

export default function HorizontalLinearStepperCS({onSubmit}) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    indexType: '',
    geojson:null
  });

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
      indexType: '',
      geojson: []
    });
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };
  const [cadastralRef, setCadastralRef] = useState('');
  const [recintoNum, setRecintoNum] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false); 

  const handleSubmit = async () => {
      setLoading(true);
      const ref = cadastralRef.replace(/\s/g, '');
      const apiUrl = `http://localhost:5004/cadastral/${ref}`;
      const queryParams = `?recintoNum=${recintoNum}`;
      try {
          const response = await fetch(`${apiUrl}${queryParams}`);
          const data = await response.json();
          console.log(data['geojson'])
          setFormData({geojson: data['geojson']});
          console.log(formData)
          onSubmit([formData, data['geojson']])
      } catch (error) {
          console.error("Error fetching data: ", error);
          setResult({ error: "Failed to fetch data" });
      }
      setLoading(false);
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
            <InputLabel id="index-type-label">Index Type</InputLabel>
            <Select
              labelId="index-type-label"
              id="index-type-select"
              value={formData.indexType}
              onChange={handleChange}
              name="indexType"
              sx={{ width: 200, margin: 1 }}
            >
              <MenuItem value="NDVI">NDVI</MenuItem>
              <MenuItem value="EVI">EVI</MenuItem>
              <MenuItem value="GNDVI">GNDVI</MenuItem>
            </Select>
          </Box>
        );
      case 2:
        return (
          <Card style={{ maxWidth: 500, margin: '20px auto' }}>
          <CardContent>
              <TextField
                  fullWidth
                  label="Ref. Catastral"
                  variant="outlined"
                  value={cadastralRef}
                  onChange={e => setCadastralRef(e.target.value)}
                  style={{ marginBottom: 16 }}
              />

                  <TextField
                      fullWidth
                      label="Número del Recinto"
                      variant="outlined"
                      value={recintoNum}
                      onChange={e => setRecintoNum(e.target.value)}
                      style={{ marginBottom: 16 }}
                  />
              
          </CardContent>
      </Card>
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
                        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>

            <Typography sx={{ mt: 2, mb: 1 }}>
              All steps completed - you're finished
            </Typography>
            <Button onClick={handleReset}>Reset</Button>
            </Box>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Back
              </Button>
              <Button onClick={() => { if (activeStep === steps.length - 1) handleSubmit(); handleNext(); }}>
                {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </Box>
          </React.Fragment>
        )}
      </div>
    </Box>
  );
}