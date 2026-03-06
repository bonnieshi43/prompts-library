# Copy Function - UI & Functional Rules

## 1. UI

### 1.1 Copy Button Status

**Rule:**

- **EM (Enterprise Manager)**  
  - Copy button is **always enabled**.

- **Portal**
  - Copy button is **disabled** when:
    - No **Condition** or **Action** is selected.
    - **Multiple Conditions** are selected.
  - Copy button is **enabled** when:
    - Exactly **one Condition** or **one Action** is selected.

---

## 2. Function

### 2.1 Copy Without Saving

**Scenario:**

1. Copy a **Condition** or **Action** in **EM** or **Portal**.
2. Close the page without saving.

**Expected Result:**

- The copied item **is not saved**.
- A confirmation dialog appears:


---

### 2.2 Copy and Save

**Scenario:**

Copy the following items in **EM** or **Portal**, then **save**:

**Conditions:**

- TimeCondition
- Completion

**Actions:**

- Dashboard
- Backup
- Batch

**Expected Result:**

- The copied **Condition / Action** is saved successfully.
- All related **properties and configurations** are preserved.

---

### 2.3 Edit Copied Item

**Scenario:**

1. Copy a **Condition** or **Action** in **EM** or **Portal**.
2. Edit the copied item.
3. Save the task.

**Expected Result:**

- The edited content of the copied item **is saved correctly**.
- The modified configuration **remains after saving**.
