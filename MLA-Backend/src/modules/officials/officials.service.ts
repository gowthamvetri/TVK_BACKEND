/**
 * Official Registry Service
 */
import fs from 'fs/promises';
import { BadRequestError } from '../../shared/utils/errors';
import { ROLES } from '../../shared/constants';
import officialsRepository from './officials.repository';

interface ParsedOfficial {
  phone: string;
  role: string;
  department?: string;
}

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const normalizeRole = (rawRole: string): string | null => {
  const cleaned = rawRole.trim().toLowerCase().replace(/\s+/g, '_');

  switch (cleaned) {
    case 'mla':
      return ROLES.MLA;
    case 'ward_councillor':
    case 'ward_councilor':
      return ROLES.WARD_COUNCILLOR;
    case 'service_officer':
    case 'serviceofficer':
    case 'officer':
      return ROLES.SERVICE_OFFICER;
    default:
      return null;
  }
};

const normalizePhone = (rawPhone: string): string => {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.length === 10) return digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return digitsOnly.slice(2);
  return digitsOnly;
};

const parseCsv = (content: string) => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parsed: ParsedOfficial[] = [];
  const invalid: string[] = [];

  lines.forEach((line, index) => {
    const columns = parseCsvLine(line);
    if (columns.length < 2) {
      invalid.push(`Line ${index + 1}: Missing columns`);
      return;
    }

    const rawPhone = columns[0] || '';
    const rawRole = columns[1] || '';
    const rawDepartment = columns[2] || '';

    if (index === 0) {
      const headerCandidate = rawPhone.toLowerCase();
      if (headerCandidate.includes('phone')) {
        return;
      }
    }

    const phone = normalizePhone(rawPhone);
    const role = normalizeRole(rawRole);

    if (!/^\d{10}$/.test(phone)) {
      invalid.push(`Line ${index + 1}: Invalid phone number`);
      return;
    }

    if (!role) {
      invalid.push(`Line ${index + 1}: Invalid role`);
      return;
    }

    const official: ParsedOfficial = { phone, role };
    if (role === ROLES.SERVICE_OFFICER && rawDepartment) {
      official.department = rawDepartment.trim();
    }

    parsed.push(official);
  });

  return { parsed, invalid };
};

const importOfficialsFromCsv = async (filePath: string, createdBy: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const { parsed, invalid } = parseCsv(content);

    if (parsed.length === 0) {
      throw new BadRequestError('No valid records found in CSV', 'CSV_EMPTY');
    }

    const result = await officialsRepository.bulkUpsert(parsed, createdBy);

    const upsertedCount = 'upsertedCount' in result ? result.upsertedCount : 0;
    const modifiedCount = 'modifiedCount' in result ? result.modifiedCount : 0;

    return {
      totalRows: parsed.length + invalid.length,
      processed: parsed.length,
      created: upsertedCount,
      updated: modifiedCount,
      invalidRows: invalid,
    };
  } finally {
    await fs.unlink(filePath).catch(() => undefined);
  }
};

const getOfficialByPhone = async (phone: string) => {
  return officialsRepository.findByPhone(phone);
};

export default {
  importOfficialsFromCsv,
  getOfficialByPhone,
};
