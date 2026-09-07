# **Generating Test Scenarios & Test Cases for GoLang APIs**

## **Purpose**

This SOP provides clear, step-by-step instructions for generating comprehensive **test scenarios** and **test cases** for GoLang API controllers using Cursor’s agent mode and predefined rule files.

---

## **Overview**

### **Step 1 — Add Rule Files**

Place the following files inside your API project within the **`.cursor`** directory:

* `scenarios_rule.mdc`
* `test_case_rule.mdc`

---

### **Step 2 — Generate Test Scenarios**

In Cursor Agent Mode, ask the agent to generate scenarios for your target controller using the scenario rules.

**Example command:**

```
follow @scenarios_rule.mdc and generate scenarios for @auth_controller.go
```

This will create a comprehensive scenarios file based on the controller logic and rule definitions.

---

### **Step 3 — Generate Test Cases**

Once the scenario file is generated, ask Cursor to create test cases using the test case rule file.

**Example command:**

```
follow @auth_controller.md and generate test cases using @test_case_rule.mdc
```

Cursor will produce structured and detailed test cases aligned with the defined rules.

---

## **Important Notes**

* Always **manually review** the generated test cases to ensure the logic is correct and aligned with actual business requirements.
* **Execute the tests** to verify correctness and identify any issues in implementation, structure, or assumptions.
* Keep the rule files (`scenarios_rule.mdc` and `test_case_rule.mdc`) updated as your API evolves to maintain consistency and accuracy.
