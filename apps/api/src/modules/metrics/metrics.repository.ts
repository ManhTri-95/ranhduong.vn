import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MetricDaily } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { PLACE_METRIC_MODEL, type PlaceMetricModel } from './schemas/place-metric.schema';

@Injectable()
export class MetricsRepository {
  constructor(@InjectModel(PLACE_METRIC_MODEL) private readonly metrics: PlaceMetricModel) {}
  async saveDaily(row: MetricDaily): Promise<void> {
    // Concurrent startup catch-up must wait for MongoDB's unique place/day index.
    await this.metrics.init();
    const filter = { placeId: new Types.ObjectId(row.placeId), dayKey: row.dayKey };
    const update = { $setOnInsert: { cityId: new Types.ObjectId(row.cityId) }, $max: row.counts };
    try { await this.metrics.updateOne(filter, update, { upsert: true }); }
    catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) throw error;
      await this.metrics.updateOne(filter, update);
    }
  }
  async weekly(cityId: string, start: string, end: string): Promise<MetricDaily[]> {
    const rows = await this.metrics.find({ cityId: new Types.ObjectId(cityId), dayKey: { $gte: start, $lte: end } }).lean();
    return rows.map((row) => MetricDaily.parse({ placeId: row.placeId.toString(), cityId: row.cityId.toString(), dayKey: row.dayKey, counts: { views: row.views, directionClicks: row.directionClicks, calls: row.calls, fanpageClicks: row.fanpageClicks } }));
  }
}
