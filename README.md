# PhenoFit Pro

**PhenoFit Pro** is a modern, browser-based web application designed for advanced phenological data analysis. Developed to eliminate the complexity of R/Python scripts, this tool empowers researchers, scientists, and students to interactively explore, model, and extract phenological events from time-series vegetation index data.

🌐 **Launch Now:** [https://itsakashpandey.github.io/PhenoFit-Pro/](https://itsakashpandey.github.io/PhenoFit-Pro/)

---

## 📘 About PhenoFit Pro

PhenoFit Pro is a purpose-built web application, tailored to perform complex phenology tasks in an intuitive and interactive way. It’s built for those who analyze vegetation indices like NDVI, GCC, EVI, ExG, etc., and need precise control over curve fitting and visualization, all from within a browser.

---

## 🚀 Key Features & Capabilities

### 📂 Data Handling
- **Loads data from CSV and Excel** files (`.csv`, `.xlsx`, `.xls`)
- **Intelligent column detection**: auto-suggests X and Y based on common names like `date`, `doy`, `gcc`, `ndvi`

### 📈 Curve Fitting
- Supports **Double Logistic**, **Single Logistic**, and smoothing filters like **LOESS**, **Moving Average**, **Savitzky-Golay**
- Interactive **slider-based tuning** for parameters (a1 to a6)
- **Lock/unlock parameters** during optimization
- One-click **numerical optimization** for best fit

### 🧹 Outlier Removal
- Detects outliers using:
  - Standard Deviation
  - Interquartile Range (IQR)
  - Moving Window SD
- **Two-phase process**: pending preview → confirmed removal

### 📊 Event & Period Annotations
- Load external "grouping" files to overlay time windows (e.g. rainfall, drought) as:
  - Vertical lines for events
  - Shaded bands for periods

### 🎨 Visual Customization
- Click-to-edit any element: point, curve, axis, background, labels, etc.
- Reposition draggable elements like legends, tooltips, and annotation boxes

### 📤 Export Capabilities
- Download **high-res PNG** chart images
- Export full results as **Excel (.xlsx)** with:
  - Raw & fitted values
  - Removed outliers
  - Optimized parameters
  - Fit statistics (R², RMSE)
  - SOS, POS, EOS dates

---

## 🧠 Technology Stack

| Layer | Technology |
|-------|------------|
| 🧱 UI Framework | React (with Hooks) |
| 🎨 Styling | Tailwind CSS (via CDN) |
| 📊 Charting | Recharts |
| 📄 File Parsing | Papaparse (CSV), SheetJS (Excel) |
| 📦 Modules | ES Modules + ImportMap (build-less) |
| 🖼 PNG Export | html-to-image |

This stack enables zero-install, zero-server usage—everything happens in-browser.


---

## 👤 Author

**Akash Kumar**  
PhD Scholar, Geomatics Engineering, IIT Roorkee  
📫 [akash_k@ce.iitr.ac.in](mailto:akash_k@ce.iitr.ac.in)  
🌐 [itsakashpandey.github.io/PhenoFit-Pro](https://itsakashpandey.github.io/PhenoFit-Pro)  
🔗 [GitHub](https://github.com/ItsAkashPandey) | [LinkedIn](https://www.linkedin.com/in/iamakashpandey/)

---

## 🧾 License

Released under **CC BY-NC-ND 4.0**. Attribution required. No commercial use or modification without permission.