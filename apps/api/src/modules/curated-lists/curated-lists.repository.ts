import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AdminCuratedList, type CuratedListEditInput } from '@ranhduong/contracts';
import { CURATED_LIST_MODEL, type CuratedListDocument, type CuratedListModel } from './schemas/curated-list.schema';

type Row = CuratedListDocument & { _id: Types.ObjectId };
function toAdmin(row: Row): AdminCuratedList {
  return AdminCuratedList.parse({ ...row, id: row._id.toString(), cityId: row.cityId.toString(), placeIds: row.placeIds.map(String) });
}
function fields(input: CuratedListEditInput) {
  return { ...input, placeIds: input.placeIds.map((id) => new Types.ObjectId(id)) };
}

@Injectable()
export class CuratedListsRepository {
  constructor(@InjectModel(CURATED_LIST_MODEL) private readonly lists: CuratedListModel) {}

  async ensureIndexes(): Promise<void> { await this.lists.createIndexes(); }

  async list(cityId: string, publishedOnly = false): Promise<AdminCuratedList[]> {
    const rows = await this.lists.find({ cityId: new Types.ObjectId(cityId), ...(publishedOnly ? { status: 'published' } : {}) })
      .sort({ createdAt: -1, _id: -1 }).lean<Row[]>();
    return rows.map(toAdmin);
  }

  async byId(id: string): Promise<AdminCuratedList | null> {
    const row = await this.lists.findById(id).lean<Row>();
    return row ? toAdmin(row) : null;
  }

  async published(cityId: string, slug: string): Promise<AdminCuratedList | null> {
    const row = await this.lists.findOne({ cityId: new Types.ObjectId(cityId), slug, status: 'published' }).lean<Row>();
    return row ? toAdmin(row) : null;
  }

  async insert(cityId: string, slug: string, input: CuratedListEditInput): Promise<AdminCuratedList> {
    const row = await this.lists.create({ ...fields(input), cityId: new Types.ObjectId(cityId), slug });
    return toAdmin(row.toObject());
  }

  async update(id: string, input: CuratedListEditInput): Promise<AdminCuratedList | null> {
    const row = await this.lists.findByIdAndUpdate(id, { $set: fields(input) }, { returnDocument: 'after', runValidators: true }).lean<Row>();
    return row ? toAdmin(row) : null;
  }
}
