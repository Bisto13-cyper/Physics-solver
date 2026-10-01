# Physics Solver V0.1

A lightweight physics calculation engine that can solve connected physical quantities using a built-in collection of related formulas.

Physics Solver is designed to do more than calculate a single formula. It can use the available inputs, explore the relationships between physical quantities, detect inconsistent inputs, and explain how each result was obtained.

> Version: V0.1
> 

---

## ✨ Features

### 🧮 Formula-Based Calculation

Physics Solver contains a collection of interconnected physics formulas based on the supported physical quantities.

For each quantity, the solver can use the available formulas and calculate it through the possible paths provided by the formula system.

For example, if enough information is available, the solver can calculate a quantity through different related formulas rather than relying on only one predefined calculation.

---

### 🧠 General Calculation

The **General Calculation** mode is the main feature of the solver.

Instead of asking the user to select a specific formula, the engine examines the available inputs and continuously searches through the supported formulas to determine everything that can be calculated from the given data.

Conceptually:

```
Known Values
     │
     ▼
Available Formulas
     │
     ▼
Calculate New Values
     │
     ▼
Use New Values Again
     │
     ▼
More Calculations
     │
     ▼
Everything That Can Be Derived
```

This allows the engine to follow chains of formulas and calculate multiple related quantities from a relatively small set of inputs.

---

### ⚠️ Conflict Detection

Physics Solver can detect conflicting or inconsistent input values.

For example, if the user provides values that do not satisfy a supported physical relationship, the solver can identify the conflict and show the user where the inconsistency occurs.

Example:

```
V = 10 V
I = 2 A
R = 10 Ω
```

According to Ohm's Law:

```
V = I × R
V = 2 × 10
V = 20 V
```

The provided value:

```
V = 10 V
```

does not match the value calculated from the other inputs.

The solver can therefore report the inconsistency instead of silently accepting contradictory data.

---

### 📖 Solution Explanation

Results are not returned as unexplained numbers.

For every calculated value, the solver can show:

1. The formula used
2. The substitution of the known values
3. The calculated result

Example:

```
Ohm's Law:

V = I × R

V = 2 × 5

V = 10 V
```

This makes the solver useful not only for calculation, but also for understanding how the result was obtained.

---

### 🔗 Multiple Calculation Paths

Because the formulas are interconnected, a quantity may be reachable through different supported relationships.

The engine can use the available information and formulas to find possible ways of calculating the requested quantity.

This makes the calculation system more flexible than a collection of isolated calculators.

---

### ⚡ Lightweight

Physics Solver is designed to remain lightweight and simple to run.

The Python backend requires only a small number of dependencies, while the JavaScript version runs directly in a web browser.

---

### 🖥️ Simple Interface

The project includes a simple and clean interface designed around:

- Physical quantity selection
- Input values
- Calculated results
- Formula explanations
- Conflict information
- General calculation

---

## 🏗️ Versions

Physics Solver currently has two versions.

### 1. Python Version

The Python version contains:

- Physics calculation engine
- General calculation engine
- Conflict detection
- Solution explanation
- FastAPI backend
- Uvicorn server

Architecture:

```
User Interface
      │
      ▼
   FastAPI
      │
      ▼
Physics Solver Engine
      │
      ├── Formula System
      ├── General Calculation
      ├── Conflict Detection
      └── Solution Explanation
```

### Requirements

- Python 3.10+
- FastAPI
- Uvicorn

### Installation

First, install Python 3.

Then install the required Python packages:

```bash
pip install fastapi uvicorn
```

### Run Locally

Start the FastAPI server with:

```bash
uvicorn main:app --reload
```

The application will then be available locally through the address shown by Uvicorn.

---

## 2. JavaScript Version

The JavaScript version is a completely standalone version.

It does not require:

- Python
- FastAPI
- Uvicorn
- Node.js
- npm
- Any backend server

All calculation logic runs directly in the browser.

### Run

Simply open the main HTML file in a modern web browser.

For example:

```
index.html
```

No installation is required.

---

## 🌍 Language Support

### Currently Supported

- Arabic
- English
- Germany

---

## 📚 Formula System

The solver is based on interconnected physical quantities and their supported relationships.

Instead of treating each formula as an isolated calculation, the engine represents formulas as relationships between quantities.

This allows the general calculation system to:

```
Find known values
       ↓
Check available formulas
       ↓
Calculate missing values
       ↓
Add the new values
       ↓
Check formulas again
       ↓
Continue until no more values can be calculated
```

This is the core idea behind the calculation engine.

---

## 🔍 Conflict Checking

Conflict checking is performed by comparing user-provided values with values that can be derived from the supported formulas.

If multiple inputs imply different values for the same physical quantity, the solver can identify the inconsistency.

For example:

```
Given:

I = 2 A
R = 10 Ω
V = 10 V
```

The formula system derives:

```
V = I × R
V = 20 V
```

Therefore:

```
Input V = 10 V
Calculated V = 20 V
```

The values are inconsistent.

---

## 🎯 Project Goals

Physics Solver was created with several goals:

- Make physics calculations easier
- Reduce repetitive manual calculations
- Explore relationships between physical quantities
- Automatically derive as many values as possible
- Detect inconsistent inputs
- Explain calculations instead of only displaying results
- Keep the application lightweight
- Provide both a Python/backend version and a standalone browser version

---

## 🚧 Roadmap

### V0.1

- [x]  Connected formula system
- [x]  General calculation
- [x]  Conflict detection
- [x]  Calculation explanations
- [x]  Python engine
- [x]  FastAPI backend
- [x]  Standalone JavaScript version
- [x]  Arabic interface
- [x]  Lightweight UI

### Future

- [ ]  More physics formulas
- [ ]  More physical quantities
- [ ]  Improved explanation system
- [ ]  More advanced conflict analysis
- [ ]  Additional calculation methods
- [ ]  More polished user interface

---

## 📁 Project Structure

The exact structure may change between versions, but the project is separated conceptually into:

```
Physics-Solver/
│
├── Python/
│   ├── Engine/
│   ├── Backend/
│   └── main.py
│   
│
├── JavaScript/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md
```

---

## 💡 Example Use Case

Instead of manually deciding which formula to use:

```
"I know these values.
Which formulas can I use?
What else can I calculate?
Are my values consistent?"
```

Physics Solver attempts to answer these questions automatically.

You provide the known values.

The engine explores the supported relationships.

It calculates what can be derived, checks for conflicts, and explains the calculations.

---

## ⚙️ Technology

### Python Version

- Python
- FastAPI
- Uvicorn

### JavaScript Version

- HTML
- CSS
- JavaScript

No external backend is required for the JavaScript version.

---

## 📌 Project Status

**Physics Solver V0.1**

This is an early version of the project.

The formula system and calculation engine are functional, while the project is still being expanded with more formulas, quantities, explanations, and language support.

---