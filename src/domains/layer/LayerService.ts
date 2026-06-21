import type { Layer, LayerCategory } from './Layer';

interface CreateLayerInput {
  id: string;
  name: string;
  category: LayerCategory;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
}

export function createLayer(input: CreateLayerInput): Layer {
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    visible: input.visible ?? true,
    locked: input.locked ?? false,
    opacity: input.opacity ?? 1,
  };
}

export function toggleLayerVisibility(layer: Layer): Layer {
  return {
    ...layer,
    visible: !layer.visible,
  };
}

export function toggleLayerLock(layer: Layer): Layer {
  return {
    ...layer,
    locked: !layer.locked,
  };
}
