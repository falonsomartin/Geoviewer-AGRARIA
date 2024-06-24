import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { TextField, FormControl, Button, MenuItem, Select, InputLabel, Accordion, AccordionSummary, AccordionDetails, Typography, Grid } from '@material-ui/core';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Plot from 'react-plotly.js';

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: '100%',
  },
  dateInput: {
    width: '100%',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

function DataSelector({ onSubmit }) {
  const classes = useStyles();
  const [formData, setFormData] = useState({
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    category: '',
    dataType: ''
  });
  const [plotData, setPlotData] = useState(null);


  const dataCategories = [
    'Sensores',
    'Cámara',
    'Enfermedades',
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'category' ? { dataType: '' } : {})
    }));
  };

  const handleSubmit = async () => {
    const response = await fetch('http://localhost:5003/data', {  // Ajusta esta URL al endpoint de tu backend
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    const result = await response.json();
    console.log(result)
    setPlotData(result.output);  // Asumiendo que result.output contiene los datos en un formato adecuado
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Data Selection</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Start Date"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={classes.dateInput}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="End Date"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={classes.dateInput}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl className={classes.formControl}>
              <InputLabel id="category-label">Data Category</InputLabel>
              <Select
                labelId="category-label"
                id="category-select"
                value={formData.category}
                onChange={handleChange}
                name="category"
              >
                {Object.keys(dataCategories).map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl className={classes.formControl}>
              <InputLabel id="data-type-label">Data Type</InputLabel>
              <Select
                labelId="data-type-label"
                id="data-type-select"
                value={formData.dataType}
                onChange={handleChange}
                name="dataType"
                disabled={!formData.category}
              >
                {formData.category && dataCategories[formData.category].map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </AccordionDetails>
      <Button onClick={handleSubmit} color="primary" variant="contained">Submit Data</Button>
      {plotData && (
        <Plot
          data={[
            {
              x: plotData.map(item => item.sampling_date),
              y: plotData.map(item => item.measurement_value || item.tracked),
              type: 'scatter',
              mode: 'lines+markers',
              marker: {color: 'red'},
            }
          ]}
          layout={{width: 720, height: 440, title: 'Data Visualization'}}
        />
      )}
    </Accordion>
  );
}

export default DataSelector;