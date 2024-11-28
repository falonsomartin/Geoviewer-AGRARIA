import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Backdrop , CircularProgress, Checkbox, FormControlLabel, FormGroup, InputLabel, MenuItem,TextField, FormControl, Grid, Button, RadioGroup, Radio, Select} from '@material-ui/core';
import { AttachFile, Description, PictureAsPdf, Theaters } from '@material-ui/icons';
import { DropzoneArea } from 'material-ui-dropzone';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import shp from 'shpjs';


const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& .MuiDropzoneArea-root': {
      minHeight: '100px',
      maxHeight: '200px',
    }
  },
  fileDetails: {
    marginTop: theme.spacing(1),
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
    fontWeight: 'bold',
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
  checkBoxContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: '100%',
  },
  inputLabel: {
    marginBottom: theme.spacing(1),
  },
  dateInput: {
    width: '100%',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  foormControl: {
    margin: theme.spacing(3),
  },
  dropzone: {
    minHeight: '191px',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  progressText: {
    marginLeft: theme.spacing(2),
  },
}));

export default function ControlledAccordions({onSubmit}) {
  const classes = useStyles();
  const [numericColumns, setNumericColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedOption, setSelectedOption] = useState('rf');
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({
    rf: false,
    svm: false,
    knn: false,
    soilDataFiles: [],
    aoiDataFiles: [],
    startDate: "2024-04-14",
    endDate: "2024-05-14",
    satelliteData: {
      sentinel1: false,
      sentinel2: false,
      landsat: false,
    },
    indexes: {
      vegetationIndexes: false,
      brightnessIndexes: false,
      moistureIndexes: false,
    },
    modelFeatures: {
      numberOfTrees: 500,
      seed: 0,
      bagFraction: 0.5,
    },
    performanceIndicators: {
      rsquare: false,
      rmse: false,
      mse: false,
      mae: false,
      rpiq: false,
    }
  });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let timerInterval;
    if (loading) {
      timerInterval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else {
      clearInterval(timerInterval);
    }

    return () => clearInterval(timerInterval);
  }, [loading]);

  const handleChangeExp = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
  
    setFormData((prev) => {
      // Desestructurar prev para mantener el estado existente
      let newState = { ...prev };
  
      // Verificar si el nombre del checkbox pertenece a un objeto anidado
      if (name in newState.satelliteData) {
        newState.satelliteData[name] = checked;
      } else if (name in newState.indexes) {
        newState.indexes[name] = checked;
      } else if (name in newState.modelFeatures) {
        newState.modelFeatures[name] = value; // Para los inputs numéricos
      } else if (name in newState.performanceIndicators) {
        newState.performanceIndicators[name] = checked;
      } else {
        // Para los demás valores (en la raíz de formData)
        newState[name] = type === 'checkbox' || type === 'radio' ? checked : value;
      }
  
      return newState;
    });
  
    if (name === "options") {
      setSelectedOption(value);
    }
  };
  

  const handleFileChange = (name, files) => {
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = await shp(event.target.result);
          const columns = data.features.length > 0 ? Object.keys(data.features[0].properties) : [];
          const numericColumns = columns.filter(key => typeof data.features[0].properties[key] === 'number');
          setNumericColumns(numericColumns);
        } catch (error) {
          console.error("Error processing shapefile", error);
        }
      };
      reader.readAsArrayBuffer(files[0]);
    }
    setFormData(prev => ({
      ...prev,
      [name]: files
    }));
    
  };

  const handleColumnChange = (event) => {
    setSelectedColumn(event.target.value);
  };

  const handleModelFeatures = () => {
    switch (selectedOption) {
      case 'rf':
        return (
          <>
            <div>
              <Typography className={classes.inputLabel}>Number of trees</Typography>
              <TextField
                className={classes.formControl}
                variant="outlined"
                name="numberOfTrees"
                value={formData.modelFeatures.numberOfTrees}
                onChange={handleChange}
                type="number"
              />
            </div>
            &nbsp;&nbsp;
            <div>
              <Typography className={classes.inputLabel}>Seed</Typography>
              <TextField
                className={classes.formControl}
                variant="outlined"
                name="seed"
                value={formData.modelFeatures.seed}
                onChange={handleChange}
                type="number"
                inputProps={{ step: "1" }}
              />
            </div>
            &nbsp;&nbsp;
            <div>
              <Typography className={classes.inputLabel}>Bag fraction</Typography>
              <TextField
                className={classes.formControl}
                variant="outlined"
                name="bagFraction"
                value={formData.modelFeatures.bagFraction}
                onChange={handleChange}
                type="number"
                inputProps={{ step: "0.1" }}

              />
            </div>
          </>
        );
      case 'svm':
        return (
          <>
            {/* Add SVM specific features here */}
          </>
        );
      case 'knn':
        return (
          <>
            {/* Add KNN specific features here */}
          </>
        );
      default:
        return null;
    }
  };

  const handlePreviewIcon = (fileObject, classes) => {
    const {type} = fileObject.file
    const iconProps = {
      className : classes.image,
    }
  
    if (type.startsWith("video/")) return <Theaters {...iconProps} />
  
    switch (type) {
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return <Description {...iconProps} />
      case "application/pdf":
        return <PictureAsPdf {...iconProps} />
      default:
        return <AttachFile {...iconProps} />
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setTimer(0); // Reset the timer when the submit button is clicked
      const data = new FormData();
      
      data.append('soilDataFiles', formData.soilDataFiles[0]);
      data.append('aoiDataFiles', formData.aoiDataFiles[0]);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);


      for (const key in formData.satelliteData) {
        data.append(key, formData.satelliteData[key]);
      }

      for (const key in formData.indexes) {
        data.append(key, formData.indexes[key]);
      }

      for (const key in formData.modelFeatures) {
        data.append(key, formData.modelFeatures[key]);
      }

      for (const key in formData.performanceIndicators) {
        data.append(key, formData.performanceIndicators[key]);
      }
      
      console.log(data);
      console.log("Aqi")
      const response = await fetch('http://localhost:5004/api/soil_organic_prediction', {
         method: 'POST',
         body: data
      });

      const result = await response.json();
      if(result){
        console.log('Data sent successfully', result);
        onSubmit(result.output);
        setLoading(false);
      }


    } catch (error) {
      setLoading(false);
      console.error('Failed to send data', error);
    }
  };

  return (
    <div className={classes.root}>
      <Accordion expanded={expanded === 'panel1'} onChange={handleChangeExp('panel1')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography className={classes.heading}>Machine learning algorithm</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup className={classes.checkBoxContainer}>
            <RadioGroup row name="options" value={selectedOption} onChange={handleChange}>
              <FormControlLabel
                value="rf"
                control={<Radio />}
                label="RF"
              />
              <FormControlLabel
                value="svm"
                control={<Radio disabled/>}
                label="SVM"
              />
              <FormControlLabel
                value="knn"
                control={<Radio disabled/>}
                label="KNN"
              />
            </RadioGroup>
          </FormGroup>
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded === 'panel2'} onChange={handleChangeExp('panel2')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2bh-content"
          id="panel2bh-header"
        >
          <Typography className={classes.heading}>Upload Files</Typography>
        </AccordionSummary>
        <AccordionDetails>
        <DropzoneArea
            onChange={(files) => handleFileChange('aoiDataFiles', files)}
            acceptedFiles={['.zip']}
            dropzoneText="Area of Interest (AOI)"
            maxFileSize={5000000}
            filesLimit={1}
            getPreviewIcon={handlePreviewIcon}
            />

          <DropzoneArea
            onChange={(files) => handleFileChange('soilDataFiles', files)}
            acceptedFiles={['.zip']}
            dropzoneText="Soil Data Input (SOC)"
            maxFileSize={5000000}
            filesLimit={1}
            getPreviewIcon={handlePreviewIcon}
            />
        </AccordionDetails>
      </Accordion>
      {numericColumns.length > 0 ? (<><Accordion expanded={expanded === 'panel6'} onChange={handleChangeExp('panel6')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel4bh-content"
          id="panel4bh-header"
        >
          <Typography className={classes.heading}>Variable to Estimate</Typography>
        </AccordionSummary>
        <AccordionDetails>
        <FormControl fullWidth>
        <InputLabel id="numeric-column-selector-label">Select Value to Estimate</InputLabel>
        <Select
          labelId="numeric-column-selector-label"
          id="numeric-column-selector"
          value={selectedColumn}
          label="Select Numeric Column"
          onChange={handleColumnChange}
        >
          {numericColumns.map((column, index) => (
            <MenuItem key={index} value={column}>{column}</MenuItem>
          ))}
        </Select>
      </FormControl>
        </AccordionDetails>
      </Accordion></>) : <></>}
      
      <Accordion expanded={expanded === 'panel3'} onChange={handleChangeExp('panel3')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3bh-content"
          id="panel3bh-header"
        >
          <Typography className={classes.heading}>Spectral Information Data</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={10}>
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
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset" className={classes.formControl}>
                <Typography variant="subtitle1">Satellite Data:</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox name="sentinel1" checked={formData.satelliteData.sentinel1} onChange={handleChange} disabled/>}
                    label="Sentinel-1"
                  />
                  <FormControlLabel
                    control={<Checkbox name="sentinel2" checked={formData.satelliteData.sentinel2} onChange={handleChange} />}
                    label="Sentinel-2"
                  />
                  <FormControlLabel
                    control={<Checkbox name="landsat" checked={formData.satelliteData.landsat} onChange={handleChange} disabled/>}
                    label="Landsat"
                  />
                </FormGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset" className={classes.formControl}>
                <Typography variant="subtitle1">Indexes:</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox name="vegetationIndexes" checked={formData.indexes.vegetationIndexes} onChange={handleChange} />}
                    label="Vegetation indexes"
                  />
                  <FormControlLabel
                    control={<Checkbox name="brightnessIndexes" checked={formData.indexes.brightnessIndexes} onChange={handleChange} />}
                    label="Brightness indexes"
                  />
                  <FormControlLabel
                    control={<Checkbox name="moistureIndexes" checked={formData.indexes.moistureIndexes} onChange={handleChange} />}
                    label="Moisture indexes"
                  />
                </FormGroup>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded === 'panel4'} onChange={handleChangeExp('panel4')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel4bh-content"
          id="panel4bh-header"
        >
          <Typography className={classes.heading}>Model features</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {handleModelFeatures()}
        </AccordionDetails>
      </Accordion>
      <Accordion expanded={expanded === 'panel5'} onChange={handleChangeExp('panel5')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel4bh-content"
          id="panel4bh-header"
        >
          <Typography className={classes.heading}>Model Performance Indicators</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup className={classes.checkBoxContainer}>
            <FormControlLabel
              control={<Checkbox name="rsquare" checked={formData.performanceIndicators.rsquare} onChange={handleChange} />}
              label="R SQUARE"
            />
            <FormControlLabel
              control={<Checkbox name="rmse" checked={formData.performanceIndicators.rmse} onChange={handleChange} />}
              label="RMSE"
            />
            <FormControlLabel
              control={<Checkbox name="mse" checked={formData.performanceIndicators.mse} onChange={handleChange} />}
              label="MSE"
            />
            <FormControlLabel
              control={<Checkbox name="mae" checked={formData.performanceIndicators.mae} onChange={handleChange} />}
              label="MAE"
            />
            <FormControlLabel
              control={<Checkbox name="rpiq" checked={formData.performanceIndicators.rpiq} onChange={handleChange} />}
              label="RPIQ"
            />
          </FormGroup>
        </AccordionDetails>
      </Accordion>
      <div>


      </div>
      <div>


      </div>
      <Button onClick={handleSubmit} color="primary" variant="contained">Submit Data</Button>
      <Backdrop className={classes.backdrop} open={loading}>
        <CircularProgress color="inherit" />
        <Typography variant="h6" className={classes.progressText}>
          Loading... {timer}s
        </Typography>
      </Backdrop>
    </div>
  );
}