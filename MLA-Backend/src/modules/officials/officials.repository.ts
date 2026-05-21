/**
 * Official Registry Repository
 */
import mongoose from 'mongoose';
import OfficialRegistry, { IOfficialRegistry } from './OfficialRegistry.model';

type OfficialId = mongoose.Types.ObjectId | string;

const findByPhone = async (phone: string): Promise<IOfficialRegistry | null> => {
  return OfficialRegistry.findOne({ phone });
};

const bulkUpsert = async (items: Array<{ phone: string; role: string }>, createdBy: OfficialId) => {
  if (items.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };
  }

  const operations = items.map((item) => ({
    updateOne: {
      filter: { phone: item.phone },
      update: {
        $set: { role: item.role },
        $setOnInsert: { createdBy },
      },
      upsert: true,
    },
  }));

  return OfficialRegistry.bulkWrite(operations, { ordered: false });
};

export default {
  findByPhone,
  bulkUpsert,
};
