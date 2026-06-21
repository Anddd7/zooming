export type LayerCategory = 'floorplan' | 'baseBuild' | 'hardFinish' | 'softDecor' | 'furniture' | 'custom';

export interface Layer {
  id: string;
  name: string;
  category: LayerCategory;
  visible: boolean;
  locked: boolean;
  opacity: number;
}
