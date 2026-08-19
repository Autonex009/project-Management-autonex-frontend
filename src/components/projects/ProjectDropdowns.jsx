import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, UserCheck } from "lucide-react";
import { formatDisplayName } from "../../utils/displayName";

const SkillMultiSelect = ({ options, value, onChange }

const EmployeeMultiSelect = ({
  name,
  defaultValue = [],
  employees,
  requiredSkills,
}

const TeamLeadMultiSelect = ({
  employees,
  value,
  onChange,
  excludeIds = [],
  // A lead cannot drop themselves from a project they are creating: the server allocates
  // the creator regardless, so allowing it would show a state that does not survive a save.
  lockedId = null,
}

const PmMultiSelect = ({ employees, value, onChange, isPm, pmEmployeeId }



export { SkillMultiSelect, EmployeeMultiSelect, TeamLeadMultiSelect, PmMultiSelect };
