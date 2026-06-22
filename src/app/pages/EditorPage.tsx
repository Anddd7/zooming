import {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

import { createEditorStore } from "../store/editorStore";
import { CanvasEditor } from "../../engine/canvas/CanvasEditor";
import { polygonAreaMm2 } from "../../domains/geometry/GeometryMeasure";
import {
  computeItemEstimate,
  summarizeEstimate,
} from "../../domains/estimate/EstimateService";
import { DEFAULT_ITEM_TAG_COLOR } from "../../domains/drawing/PrimitiveItem";
import {
  normalizeItemPricingRule,
  type PrimitiveKind,
  type PricingMode,
} from "../../domains/drawing/PrimitiveItem";
import type { EditorStoreState } from "../store/editorStore";
import type { Point } from "../../domains/geometry/Geometry";

const EDITOR_STORAGE_KEY = "zooming.editor.snapshot.v1";
const IMPORT_POLYGON_PROMPT_TEMPLATE =
  "以户型图左上角为(0,0)原点，X右Y下，单位mm；按图纸标注毫米尺寸累加计算边界；识别全部房间，每个房间多边形顶点严格顺时针排序；输出仅含房间名-顶点二维数组的纯JSON，无额外内容。";

type Locale = "zh" | "en";

const messages = {
  zh: {
    addLine: "添加线段",
    addRect: "添加矩形",
    addPolygon: "添加多边形",
    importPolygons: "导入多边形",
    importPolygonsDialogTitle: "导入户型多边形",
    importPolygonsPromptLabel: "提示词",
    importPolygonsCopyPrompt: "一键复制提示词",
    importPolygonsCopyFailed: "复制失败，请手动复制。",
    importPolygonsInput: "多边形 JSON",
    importPolygonsAction: "导入",
    favorite: "收藏",
    assetLibrary: "素材库",
    tile: "平铺",
    alignHorizontal: "水平对齐",
    alignVertical: "垂直对齐",
    tileDialogTitle: "平铺复制",
    tileX: "平铺 X",
    tileY: "平铺 Y",
    applyTile: "执行平铺",
    assetLibraryDialogTitle: "素材库",
    insertAsset: "插入",
    lineWidth: "线宽",
    cancel: "取消",
    importPolygonsInvalid: "JSON 格式无效：请检查多边形数据。",
    copySelected: "复制选中",
    deleteSelected: "删除选中",
    quickZoom: "快速缩放",
    layers: "图层",
    addLayer: "新增图层",
    deleteSelectedLayer: "删除选中图层",
    selectLayer: "选择图层",
    lockLayer: "锁定图层",
    unlockLayer: "解锁图层",
    hideLayer: "隐藏图层",
    showLayer: "显示图层",
    properties: "属性",
    itemTitle: "对象名称",
    clickToEditAlias: "点击编辑名称",
    layerLockedEditingDisabled: "图层已锁定：禁止编辑。",
    cost: "成本",
    notApplicable: "不适用",
    materialPricing: "材质与计价",
    material: "材质",
    pricingMode: "计价模式",
    pricingModeNone: "不计价",
    pricingModeFixed: "固定价",
    pricingModePerLength: "按长度",
    pricingModePerArea: "按面积(mm²)",
    pricingModePerAreaM2: "按面积(m²)",
    price: "价格",
    wasteRate: "损耗率",
    estimate: "估算",
    quantity: "数量",
    position: "位置",
    layer: "图层",
    rotation: "旋转",
    rotationAngle: "旋转角度",
    widthMm: "宽 (mm)",
    heightMm: "高 (mm)",
    vertices: "顶点",
    addPoint: "+ 顶点",
    removePoint: "- 顶点",
    tag: "标签",
    color: "颜色",
    budget: "预算",
    estimationBudget: "估算 / 预算",
    close: "关闭",
    closeBudget: "关闭预算",
    budgetAmount: "预算金额",
    currency: "币种",
    currentEstimation: "当前估算",
    budgetLabel: "预算",
    overBudget: "超预算",
    withinBudget: "预算内",
    estimationDetails: "估算明细",
    tableItem: "项目",
    tableMaterial: "材质",
    tablePrice: "价格",
    tableQuality: "工程量",
    tableTotal: "总计",
    language: "语言",
    languageZh: "中文",
    languageEn: "English",
  },
  en: {
    addLine: "Add Line",
    addRect: "Add Rect",
    addPolygon: "Add Polygon",
    importPolygons: "Import Polygons",
    importPolygonsDialogTitle: "Import Floorplan Polygons",
    importPolygonsPromptLabel: "Prompt",
    importPolygonsCopyPrompt: "Copy prompt",
    importPolygonsCopyFailed: "Copy failed, please copy manually.",
    importPolygonsInput: "Polygon JSON",
    importPolygonsAction: "Import",
    favorite: "Favorite",
    assetLibrary: "Assets",
    tile: "Tile",
    alignHorizontal: "Align Horizontal",
    alignVertical: "Align Vertical",
    tileDialogTitle: "Tile Copy",
    tileX: "Tile X",
    tileY: "Tile Y",
    applyTile: "Apply Tile",
    assetLibraryDialogTitle: "Asset Library",
    insertAsset: "Insert",
    lineWidth: "Line Width",
    cancel: "Cancel",
    importPolygonsInvalid: "Invalid JSON format: please check polygon data.",
    copySelected: "Copy Selected",
    deleteSelected: "Delete Selected",
    quickZoom: "Quick zoom",
    layers: "Layers",
    addLayer: "Add Layer",
    deleteSelectedLayer: "Delete Selected Layer",
    selectLayer: "Select layer",
    lockLayer: "Lock layer",
    unlockLayer: "Unlock layer",
    hideLayer: "Hide layer",
    showLayer: "Show layer",
    properties: "Properties",
    itemTitle: "Item Title",
    clickToEditAlias: "Click to edit alias",
    layerLockedEditingDisabled: "Layer locked: editing disabled.",
    cost: "Cost",
    notApplicable: "N/A",
    materialPricing: "Material & Pricing",
    material: "Material",
    pricingMode: "Pricing Mode",
    pricingModeNone: "none",
    pricingModeFixed: "fixed",
    pricingModePerLength: "perLength",
    pricingModePerArea: "perArea",
    pricingModePerAreaM2: "perAreaM2",
    price: "Price",
    wasteRate: "Waste Rate",
    estimate: "Estimate",
    quantity: "Qty",
    position: "Position",
    layer: "Layer",
    rotation: "Rotation",
    rotationAngle: "Rotation angle",
    widthMm: "W (mm)",
    heightMm: "H (mm)",
    vertices: "Vertices",
    addPoint: "+ Point",
    removePoint: "- Point",
    tag: "Tag",
    color: "Color",
    budget: "Budget",
    estimationBudget: "Estimation / Budget",
    close: "Close",
    closeBudget: "Close Budget",
    budgetAmount: "Budget Amount",
    currency: "Currency",
    currentEstimation: "Current Estimation",
    budgetLabel: "Budget",
    overBudget: "Over Budget",
    withinBudget: "Within Budget",
    estimationDetails: "Estimation Details",
    tableItem: "item",
    tableMaterial: "material",
    tablePrice: "price",
    tableQuality: "quality",
    tableTotal: "total",
    language: "Language",
    languageZh: "中文",
    languageEn: "English",
  },
} as const;

type MessageKey = keyof (typeof messages)["zh"];

type VertexDisplay = {
  alias: string;
  pointIndex: number;
  point: { xMm: number; yMm: number };
};

type EdgeDisplay = {
  name: string;
  edgeIndex: number;
  lengthMm: number;
};

type ImportedPolygonInput = Array<{
  name: string;
  points: { xMm: number; yMm: number }[];
}>;

type PrimitiveTemplate = {
  name: string;
  kind: PrimitiveKind;
  points: Point[];
  lineWidth?: number;
};

const STANDARD_ASSET_TEMPLATES: PrimitiveTemplate[] = [
  {
    name: "标准素材-门洞",
    kind: "rect",
    points: [
      { xMm: -450, yMm: -50 },
      { xMm: 450, yMm: -50 },
      { xMm: 450, yMm: 50 },
      { xMm: -450, yMm: 50 },
    ],
  },
  {
    name: "标准素材-双人沙发",
    kind: "rect",
    points: [
      { xMm: -900, yMm: -400 },
      { xMm: 900, yMm: -400 },
      { xMm: 900, yMm: 400 },
      { xMm: -900, yMm: 400 },
    ],
  },
  {
    name: "标准素材-墙线",
    kind: "polyline",
    lineWidth: 4,
    points: [
      { xMm: -800, yMm: 0 },
      { xMm: 800, yMm: 0 },
    ],
  },
];

function parseImportedPolygonJson(raw: string): ImportedPolygonInput {
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid root");
  }

  const entries = Object.entries(parsed);

  if (entries.length === 0) {
    throw new Error("empty polygons");
  }

  return entries.map(([name, vertices]) => {
    if (!Array.isArray(vertices) || vertices.length < 3) {
      throw new Error("invalid polygon vertices");
    }

    const points = vertices.map((vertex) => {
      if (
        !Array.isArray(vertex) ||
        vertex.length !== 2 ||
        typeof vertex[0] !== "number" ||
        typeof vertex[1] !== "number" ||
        !Number.isFinite(vertex[0]) ||
        !Number.isFinite(vertex[1])
      ) {
        throw new Error("invalid point");
      }

      return {
        xMm: vertex[0],
        yMm: vertex[1],
      };
    });

    return {
      name,
      points,
    };
  });
}

function vertexAlias(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  if (index < alphabet.length) {
    return alphabet[index];
  }

  return `V${index + 1}`;
}

function edgeLengthMm(
  start: { xMm: number; yMm: number },
  end: { xMm: number; yMm: number },
) {
  return Math.hypot(end.xMm - start.xMm, end.yMm - start.yMm);
}

function pointsCenter(points: Point[]): Point {
  if (points.length === 0) {
    return { xMm: 0, yMm: 0 };
  }

  const sum = points.reduce(
    (acc, point) => ({
      xMm: acc.xMm + point.xMm,
      yMm: acc.yMm + point.yMm,
    }),
    { xMm: 0, yMm: 0 },
  );

  return {
    xMm: sum.xMm / points.length,
    yMm: sum.yMm / points.length,
  };
}

function toTemplateFromItem(item: EditorStoreState["items"][number]): PrimitiveTemplate {
  const center = pointsCenter(item.points);

  return {
    name: `收藏-${item.name ?? item.id}`,
    kind: item.kind,
    lineWidth: item.lineWidth,
    points: item.points.map((point) => ({
      xMm: point.xMm - center.xMm,
      yMm: point.yMm - center.yMm,
    })),
  };
}

type PersistedEditorSnapshot = {
  selectedLayerId: string | null;
  selectedItemIds: string[];
  layers: EditorStoreState["layers"];
  items: EditorStoreState["items"];
  projectBudget: EditorStoreState["projectBudget"];
  zoomLevel: number;
};

function loadPersistedEditorSnapshot(): PersistedEditorSnapshot | null {
  try {
    const raw = window.localStorage.getItem(EDITOR_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedEditorSnapshot>;

    if (!Array.isArray(parsed.layers) || !Array.isArray(parsed.items)) {
      return null;
    }

    return {
      selectedLayerId: parsed.selectedLayerId ?? null,
      selectedItemIds: Array.isArray(parsed.selectedItemIds)
        ? parsed.selectedItemIds
        : [],
      layers: parsed.layers,
      items: parsed.items,
      projectBudget:
        parsed.projectBudget &&
        typeof parsed.projectBudget.amount === "number" &&
        typeof parsed.projectBudget.currency === "string"
          ? parsed.projectBudget
          : { amount: 100_000, currency: "CNY" },
      zoomLevel:
        typeof parsed.zoomLevel === "number" && !Number.isNaN(parsed.zoomLevel)
          ? parsed.zoomLevel
          : 1,
    };
  } catch {
    return null;
  }
}

function itemRotationDeg(points: { xMm: number; yMm: number }[]) {
  if (points.length < 2) {
    return 0;
  }

  const first = points[0];
  const second = points[1];
  return (
    (Math.atan2(second.yMm - first.yMm, second.xMm - first.xMm) * 180) / Math.PI
  );
}

function segmentLength(
  a: { xMm: number; yMm: number },
  b: { xMm: number; yMm: number },
) {
  return Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm);
}

function formatCurrency(value: number, currency: string) {
  return `${currency} ${value.toFixed(2)}`;
}

function formatQuantity(mode: PricingMode, quantity: number) {
  if (mode === "none") {
    return "-";
  }

  if (mode === "fixed") {
    return "1";
  }

  if (mode === "perLength") {
    return `${quantity.toFixed(2)} mm`;
  }

  if (mode === "perArea") {
    return `${quantity.toFixed(2)} mm²`;
  }

  if (mode === "perAreaM2") {
    return `${quantity.toFixed(4)} m²`;
  }

  return `${quantity.toFixed(2)} mm²`;
}

function pricingUnit(mode: PricingMode) {
  if (mode === "none") {
    return "-";
  }

  if (mode === "fixed") {
    return "item";
  }

  if (mode === "perLength") {
    return "mm";
  }

  if (mode === "perArea") {
    return "mm²";
  }

  if (mode === "perAreaM2") {
    return "m²";
  }

  return "-";
}

function formatPlainPrice(value: number) {
  return value.toFixed(2);
}

function formatPlainTotal(value: number) {
  const rounded = Math.round(value);

  if (Math.abs(value - rounded) < 1e-6) {
    return String(rounded);
  }

  return value.toFixed(2);
}

function formatEstimateQuality(mode: PricingMode, quantity: number) {
  if (mode === "fixed") {
    return "1";
  }

  const unit = pricingUnit(mode);
  const compactValue = Number(quantity.toFixed(4)).toString();

  return `${compactValue}(${unit})`;
}

export function EditorPage() {
  const persistedSnapshot = useMemo(loadPersistedEditorSnapshot, []);
  const storeRef = useRef(
    createEditorStore(
      persistedSnapshot
        ? {
            selectedLayerId: persistedSnapshot.selectedLayerId,
            selectedItemIds: persistedSnapshot.selectedItemIds,
            layers: persistedSnapshot.layers,
            items: persistedSnapshot.items,
            projectBudget: persistedSnapshot.projectBudget,
          }
        : undefined,
    ),
  );
  const store = storeRef.current;
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const selectedItem = state.items.find(
    (item) => item.id === state.selectedItemIds[0],
  );
  const sortedLayers = [...state.layers].sort((a, b) => b.zIndex - a.zIndex);
  const [zoomLevel, setZoomLevel] = useState(persistedSnapshot?.zoomLevel ?? 1);
  const [isMaterialExpanded, setIsMaterialExpanded] = useState(false);
  const [isPositionExpanded, setIsPositionExpanded] = useState(false);
  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const [isAssetLibraryModalOpen, setIsAssetLibraryModalOpen] = useState(false);
  const [isTileModalOpen, setIsTileModalOpen] = useState(false);
  const [tileXDraft, setTileXDraft] = useState("2");
  const [tileYDraft, setTileYDraft] = useState("2");
  const [favoriteTemplates, setFavoriteTemplates] = useState<PrimitiveTemplate[]>([]);
  const [viewportCenter, setViewportCenter] = useState<Point>({ xMm: 0, yMm: 0 });
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isImportPolygonsModalOpen, setIsImportPolygonsModalOpen] =
    useState(false);
  const [importPolygonJsonDraft, setImportPolygonJsonDraft] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");
  const [titleDraft, setTitleDraft] = useState("");
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const t = useCallback(
    (key: MessageKey) => messages[locale][key],
    [locale],
  );
  const estimateSummary = useMemo(
    () => summarizeEstimate(state.items),
    [state.items],
  );
  const selectedItemEstimate = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return computeItemEstimate(selectedItem);
  }, [selectedItem]);
  const selectedItemPricing = useMemo(
    () => normalizeItemPricingRule(selectedItem?.pricing),
    [selectedItem],
  );
  const selectedItemTagColor = selectedItem?.tagColor ?? DEFAULT_ITEM_TAG_COLOR;
  const availableTemplates = useMemo(
    () => [
      ...STANDARD_ASSET_TEMPLATES,
      ...favoriteTemplates,
    ],
    [favoriteTemplates],
  );
  const selectedItemLayer = selectedItem
    ? state.layers.find((layer) => layer.id === selectedItem.layerId)
    : null;
  const isSelectedItemLayerLocked = selectedItemLayer?.locked ?? false;
  const overBudget = estimateSummary.totalCost > state.projectBudget.amount;
  const estimateByItemId = useMemo(
    () =>
      new Map(
        estimateSummary.itemEstimates.map((estimate) => [
          estimate.itemId,
          estimate,
        ]),
      ),
    [estimateSummary.itemEstimates],
  );
  const vertexRows = useMemo<VertexDisplay[]>(() => {
    if (!selectedItem) {
      return [];
    }

    return selectedItem.points.map((point, pointIndex) => ({
      alias: vertexAlias(pointIndex),
      pointIndex,
      point,
    }));
  }, [selectedItem]);
  const edgeRows = useMemo<EdgeDisplay[]>(() => {
    if (!selectedItem) {
      return [];
    }

    const isPolyline = selectedItem.kind === "polyline";
    const isPolygon = selectedItem.kind === "polygon";

    if (!isPolyline && !isPolygon) {
      return [];
    }

    const edgeCount = isPolyline
      ? Math.max(0, selectedItem.points.length - 1)
      : selectedItem.points.length;

    return Array.from({ length: edgeCount }, (_, edgeIndex) => {
      const startIndex = edgeIndex;
      const endIndex = isPolyline
        ? edgeIndex + 1
        : (edgeIndex + 1) % selectedItem.points.length;
      const startAlias = vertexAlias(startIndex);
      const endAlias = vertexAlias(endIndex);
      const startPoint = selectedItem.points[startIndex];
      const endPoint = selectedItem.points[endIndex];

      return {
        name: `${startAlias}${endAlias}`,
        edgeIndex,
        lengthMm: edgeLengthMm(startPoint, endPoint),
      };
    });
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      setIsEditingTitle(false);
      setTitleDraft("");
      return;
    }

    if (!isEditingTitle) {
      setTitleDraft(selectedItem.name ?? "");
    }
  }, [selectedItem, isEditingTitle]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (event.key === "Escape") {
        setIsBudgetModalOpen(false);
        setIsImportPolygonsModalOpen(false);
        setIsEditingTitle(false);
        store.getState().selectItems([]);
        return;
      }

      if (isTypingTarget) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        const [selectedId] = store.getState().selectedItemIds;

        if (selectedId) {
          setCopiedItemId(selectedId);
          event.preventDefault();
        }

        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        const fallbackSelectedId = store.getState().selectedItemIds[0] ?? null;
        const sourceItemId = copiedItemId ?? fallbackSelectedId;

        if (sourceItemId) {
          store.getState().duplicateItemById(sourceItemId);
          event.preventDefault();
        }

        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        store.getState().undo();
        event.preventDefault();
        return;
      }

      if (event.key === "Delete") {
        store.getState().deleteSelectedItem();
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [copiedItemId, store]);

  const commitTitleEdit = useCallback(() => {
    if (!selectedItem) {
      return;
    }

    state.updateSelectedItemName(
      titleDraft.trim() || selectedItem.name || "item",
    );
    setIsEditingTitle(false);
  }, [selectedItem, state, titleDraft]);

  const iconButtonClass =
    "grid h-8 w-8 place-items-center rounded border border-hairline bg-canvas/80 text-body transition-colors hover:bg-canvas";

  const quickZoomLevels = [1, 0.8, 0.5, 0.1];

  useEffect(() => {
    function persistSnapshot() {
      try {
        const currentState = store.getState();

        const snapshot: PersistedEditorSnapshot = {
          selectedLayerId: currentState.selectedLayerId,
          selectedItemIds: currentState.selectedItemIds,
          layers: currentState.layers,
          items: currentState.items,
          projectBudget: currentState.projectBudget,
          zoomLevel,
        };

        window.localStorage.setItem(
          EDITOR_STORAGE_KEY,
          JSON.stringify(snapshot),
        );
      } catch {
        // ignore storage write failures
      }
    }

    const unsubscribe = store.subscribe(() => {
      persistSnapshot();
    });

    persistSnapshot();

    return () => {
      unsubscribe();
    };
  }, [store, zoomLevel]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-3">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-auto absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hairline bg-canvas/70 px-3 py-2 text-sm shadow-sm backdrop-blur">
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("addLine")}
            title={t("addLine")}
            onClick={() => state.addPrimitive("polyline", viewportCenter)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <line
                x1="5"
                y1="18"
                x2="19"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("addRect")}
            title={t("addRect")}
            onClick={() => state.addPrimitive("rect", viewportCenter)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <rect
                x="5"
                y="6"
                width="14"
                height="12"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("addPolygon")}
            title={t("addPolygon")}
            onClick={() => state.addPrimitive("polygon", viewportCenter)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                d="M5 16L9 6L18 8L19 17L8 19Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("importPolygons")}
            title={t("importPolygons")}
            onClick={() => setIsImportPolygonsModalOpen(true)}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("copySelected")}
            title={t("copySelected")}
            onClick={() => state.copySelectedItem()}
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("favorite")}
            title={t("favorite")}
            onClick={() => {
              const selected = state.items.find(
                (item) => item.id === state.selectedItemIds[0],
              );

              if (!selected) {
                return;
              }

              setFavoriteTemplates((current) => [...current, toTemplateFromItem(selected)]);
            }}
          >
            ★
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("assetLibrary")}
            title={t("assetLibrary")}
            onClick={() => setIsAssetLibraryModalOpen(true)}
          >
            ▦
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("tile")}
            title={t("tile")}
            onClick={() => setIsTileModalOpen(true)}
          >
            ⊞
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("alignHorizontal")}
            title={t("alignHorizontal")}
            onClick={() => state.alignSelectedItemsHorizontal()}
          >
            ⇆
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("alignVertical")}
            title={t("alignVertical")}
            onClick={() => state.alignSelectedItemsVertical()}
          >
            ⇅
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("deleteSelected")}
            title={t("deleteSelected")}
            onClick={() => state.deleteSelectedItem()}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="pointer-events-auto absolute right-2 top-12 z-10 max-h-[200px] w-64 overflow-y-auto rounded-lg border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          <label className="mb-2 block">
            <span className="mb-0.5 block text-[11px]">{t("quickZoom")}</span>
            <select
              aria-label={t("quickZoom")}
              className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
              value={String(zoomLevel)}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);

                if (!Number.isNaN(nextZoom)) {
                  setZoomLevel(nextZoom);
                }
              }}
            >
              {quickZoomLevels.map((level) => (
                <option key={level} value={level}>
                  {level}x
                </option>
              ))}
            </select>
          </label>
          <div className="mb-2 flex items-center justify-between font-semibold">
            <span>{t("layers")}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded border border-hairline bg-canvas/70"
                aria-label={t("addLayer")}
                onClick={() =>
                  state.addLayer(`Layer ${state.layers.length + 1}`)
                }
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded border border-hairline bg-canvas/70"
                aria-label={t("deleteSelectedLayer")}
                onClick={() => state.deleteSelectedLayer()}
              >
                <MinusCircleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {sortedLayers.map((layer) => {
              const isSelected = layer.id === state.selectedLayerId;

              return (
                <div
                  key={layer.id}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                    isSelected ? "bg-blue-100 text-blue-800" : "bg-canvas/70"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`${t("selectLayer")} ${layer.name}`}
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => state.selectLayer(layer.id)}
                  >
                    {layer.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="grid h-5 w-5 place-items-center rounded border border-hairline bg-canvas/70"
                      aria-label={
                        layer.locked
                          ? `${t("unlockLayer")} ${layer.name}`
                          : `${t("lockLayer")} ${layer.name}`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        state.toggleLayerLock(layer.id);
                      }}
                    >
                      {layer.locked ? (
                        <LockClosedIcon className="h-3.5 w-3.5" />
                      ) : (
                        <LockOpenIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="grid h-5 w-5 place-items-center rounded border border-hairline bg-canvas/70"
                      aria-label={
                        layer.visible
                          ? `${t("hideLayer")} ${layer.name}`
                          : `${t("showLayer")} ${layer.name}`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        state.toggleLayerVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? (
                        <EyeIcon className="h-3.5 w-3.5" />
                      ) : (
                        <EyeSlashIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="text-[10px] opacity-70">
                      z:{layer.zIndex}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="pointer-events-auto absolute right-2 top-[18rem] z-10 max-h-[700px] w-64 overflow-y-auto rounded-lg border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          {selectedItem ? (
            isEditingTitle ? (
              <input
                aria-label={t("itemTitle")}
                className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1 text-sm font-semibold"
                value={titleDraft}
                autoFocus
                disabled={isSelectedItemLayerLocked}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitTitleEdit();
                  }

                  if (event.key === "Escape") {
                    setIsEditingTitle(false);
                    setTitleDraft(selectedItem.name ?? "");
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="w-full truncate text-left text-sm font-semibold"
                title={t("clickToEditAlias")}
                onClick={() => {
                  if (isSelectedItemLayerLocked) {
                    return;
                  }

                  setTitleDraft(selectedItem.name ?? "");
                  setIsEditingTitle(true);
                }}
              >
                {selectedItem.name ?? "item"}
              </button>
            )
          ) : (
            <div className="font-semibold">{t("properties")}</div>
          )}
          {selectedItem ? (
            <div className="mt-2 space-y-2">
              {isSelectedItemLayerLocked ? (
                <div className="rounded border border-hairline bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                  {t("layerLockedEditingDisabled")}
                </div>
              ) : null}
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px] text-ink-muted-48">
                <div className="font-medium text-body">{t("cost")}</div>
                <div className="mt-0.5">
                  {selectedItem.kind === "polyline"
                    ? t("notApplicable")
                    : (() => {
                        const areaMm2 = polygonAreaMm2(selectedItem.points);
                        const areaM2 = areaMm2 / 1_000_000;
                        return `${Math.round(areaMm2)} mm² / ${areaM2.toFixed(3)} m²`;
                      })()}
                </div>
                <div>
                  {formatCurrency(
                    selectedItemEstimate?.cost ?? 0,
                    state.projectBudget.currency,
                  )}
                </div>
              </div>
              {selectedItem.kind === "polyline" ? (
                <label className="block rounded border border-hairline bg-canvas/70 px-2 py-1">
                  <span className="mb-0.5 block">{t("lineWidth")}</span>
                  <input
                    aria-label={t("lineWidth")}
                    type="number"
                    min={1}
                    className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                    value={selectedItem.lineWidth ?? 1}
                    disabled={isSelectedItemLayerLocked}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);

                      if (!Number.isNaN(nextValue)) {
                        state.updateSelectedItemLineWidth(nextValue);
                      }
                    }}
                  />
                </label>
              ) : null}
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsMaterialExpanded((current) => !current)}
                >
                  <span>{t("materialPricing")}</span>
                  <span>{isMaterialExpanded ? "−" : "+"}</span>
                </button>
                {isMaterialExpanded ? (
                  <div className="mt-1 space-y-1">
                    <label className="block">
                      <span className="mb-0.5 block">{t("material")}</span>
                      <input
                        aria-label={t("material")}
                        className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                        value={selectedItemPricing.materialName}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedItemPricing({
                            materialName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block">{t("pricingMode")}</span>
                      <select
                        aria-label={t("pricingMode")}
                        className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                        value={selectedItemPricing.mode}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedItemPricing({
                            mode: event.target.value as PricingMode,
                          })
                        }
                      >
                        <option value="none">{t("pricingModeNone")}</option>
                        <option value="fixed">{t("pricingModeFixed")}</option>
                        <option value="perLength">{t("pricingModePerLength")}</option>
                        <option value="perArea">{t("pricingModePerArea")}</option>
                        <option value="perAreaM2">{t("pricingModePerAreaM2")}</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="mb-0.5 block">{t("price")}</span>
                        <input
                          aria-label={t("price")}
                          type="number"
                          className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                          value={selectedItemPricing.unitPrice}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);

                            if (!Number.isNaN(nextValue)) {
                              state.updateSelectedItemPricing({
                                unitPrice: nextValue,
                              });
                            }
                          }}
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block">{t("wasteRate")}</span>
                        <input
                          aria-label={t("wasteRate")}
                          type="number"
                          step="0.01"
                          className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                          value={selectedItemPricing.wasteRate}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);

                            if (!Number.isNaN(nextValue)) {
                              state.updateSelectedItemPricing({
                                wasteRate: nextValue,
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                    {selectedItemEstimate ? (
                      <div className="rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px] text-ink-muted-48">
                        <div className="font-medium text-body">{t("estimate")}</div>
                        <div className="mt-0.5">
                          {t("quantity")}: {" "}
                          {formatQuantity(
                            selectedItemPricing.mode,
                            selectedItemEstimate.quantity,
                          )}
                        </div>
                        <div>
                          {t("cost")}: {" "}
                          {formatCurrency(
                            selectedItemEstimate.cost,
                            state.projectBudget.currency,
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsPositionExpanded((current) => !current)}
                >
                  <span>{t("position")}</span>
                  <span>{isPositionExpanded ? "−" : "+"}</span>
                </button>
                {isPositionExpanded ? (
                  <div className="mt-1 space-y-2">
                    <label className="block">
                      <span className="mb-0.5 block">{t("layer")}</span>
                      <select
                        className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                        value={selectedItem.layerId}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedPrimitiveLayer(event.target.value)
                        }
                      >
                        {state.layers.map((layer) => (
                          <option key={layer.id} value={layer.id}>
                            {layer.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-1 space-y-2">
                      <div className="mb-1 text-[11px] font-medium">
                        {t("rotation")}
                      </div>
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1">
                        <input
                          aria-label={t("rotationAngle")}
                          type="number"
                          className="min-w-0 rounded border border-hairline bg-canvas/70 px-2 py-1"
                          value={Math.round(
                            itemRotationDeg(selectedItem.points),
                          )}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextAngle = Number(event.target.value);

                            if (!Number.isNaN(nextAngle)) {
                              state.rotateSelectedPrimitiveTo(nextAngle);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="whitespace-nowrap rounded border border-hairline bg-canvas/70 px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.rotateSelectedPrimitiveBy(15)}
                        >
                          +15°
                        </button>
                        <button
                          type="button"
                          className="whitespace-nowrap rounded border border-hairline bg-canvas/70 px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.rotateSelectedPrimitiveBy(90)}
                        >
                          +90°
                        </button>
                      </div>
                    </div>
                    {selectedItem.kind === "rect" &&
                    selectedItem.points.length === 4 ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <span className="mb-0.5 block">{t("widthMm")}</span>
                          <input
                            type="number"
                            className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                            value={Math.round(
                              segmentLength(
                                selectedItem.points[0],
                                selectedItem.points[1],
                              ),
                            )}
                            disabled={isSelectedItemLayerLocked}
                            onChange={(event) => {
                              const nextWidth = Number(event.target.value);
                              const currentHeight = segmentLength(
                                selectedItem.points[1],
                                selectedItem.points[2],
                              );

                              if (!Number.isNaN(nextWidth)) {
                                state.updateSelectedPrimitiveDimensions({
                                  widthMm: nextWidth,
                                  heightMm: currentHeight,
                                });
                              }
                            }}
                          />
                        </label>
                        <label>
                          <span className="mb-0.5 block">{t("heightMm")}</span>
                          <input
                            type="number"
                            className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                            value={Math.round(
                              segmentLength(
                                selectedItem.points[1],
                                selectedItem.points[2],
                              ),
                            )}
                            disabled={isSelectedItemLayerLocked}
                            onChange={(event) => {
                              const nextHeight = Number(event.target.value);
                              const currentWidth = segmentLength(
                                selectedItem.points[0],
                                selectedItem.points[1],
                              );

                              if (!Number.isNaN(nextHeight)) {
                                state.updateSelectedPrimitiveDimensions({
                                  widthMm: currentWidth,
                                  heightMm: nextHeight,
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : null}
                    <div className="text-[11px] font-medium">{t("vertices")}</div>
                    {vertexRows.map(({ alias, pointIndex, point }) => (
                      <div
                        key={`${selectedItem.id}-point-${pointIndex}`}
                        className="grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1"
                      >
                        <span className="text-[11px] text-ink-muted-48">{alias}</span>
                        <input
                          type="number"
                          className="min-w-0 w-full rounded border border-hairline bg-canvas px-2 py-1"
                          value={Math.round(point.xMm)}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextX = Number(event.target.value);

                            if (!Number.isNaN(nextX)) {
                              state.updateSelectedPrimitivePoint(pointIndex, {
                                xMm: nextX,
                                yMm: point.yMm,
                              });
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="min-w-0 w-full rounded border border-hairline bg-canvas px-2 py-1"
                          value={Math.round(point.yMm)}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextY = Number(event.target.value);

                            if (!Number.isNaN(nextY)) {
                              state.updateSelectedPrimitivePoint(pointIndex, {
                                xMm: point.xMm,
                                yMm: nextY,
                              });
                            }
                          }}
                        />
                      </div>
                    ))}
                    {edgeRows.length > 0 ? (
                      <>
                        <div className="mt-1 text-[11px] font-medium">Edges</div>
                        {edgeRows.map((edge) => (
                          <label
                            key={`${selectedItem.id}-edge-${edge.name}`}
                            className="grid grid-cols-[auto_1fr] items-center gap-1"
                          >
                            <span className="text-[11px] text-ink-muted-48">
                              {edge.name}
                            </span>
                            <input
                              aria-label={`Edge ${edge.name}`}
                              type="number"
                              className="rounded border border-hairline bg-canvas px-2 py-1"
                              value={Math.round(edge.lengthMm)}
                              disabled={isSelectedItemLayerLocked}
                              onChange={(event) => {
                                const nextLength = Number(event.target.value);

                                if (!Number.isNaN(nextLength)) {
                                  state.updateSelectedPrimitiveEdgeLength(
                                    edge.edgeIndex,
                                    nextLength,
                                  );
                                }
                              }}
                            />
                          </label>
                        ))}
                      </>
                    ) : null}
                    {selectedItem.kind === "polyline" ||
                    selectedItem.kind === "polygon" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.appendSelectedPrimitivePoint()}
                        >
                          {t("addPoint")}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.removeSelectedPrimitivePoint()}
                        >
                          {t("removePoint")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsTagExpanded((current) => !current)}
                >
                  <span>{t("tag")}</span>
                  <span>{isTagExpanded ? "−" : "+"}</span>
                </button>
                {isTagExpanded ? (
                  <div className="mt-1">
                    <label className="block">
                      <span className="mb-0.5 block">{t("color")}</span>
                      <input
                        aria-label={`${t("tag")} ${t("color")}`}
                        type="color"
                        className="h-8 w-full rounded border border-hairline bg-canvas p-1"
                        value={selectedItemTagColor}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedItemTagColor(event.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-ink-muted-48">-</div>
          )}
        </div>
        <div className="pointer-events-auto absolute bottom-2 left-20 z-10 rounded-xl border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          <label className="flex items-center gap-2">
            <span>{t("language")}</span>
            <select
              aria-label={t("language")}
              className="rounded border border-hairline bg-canvas/70 px-2 py-1"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="zh">{messages.zh.languageZh}</option>
              <option value="en">{messages.en.languageEn}</option>
            </select>
          </label>
        </div>
        <div className="pointer-events-auto absolute bottom-2 left-2 z-10 rounded-xl border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          <button
            type="button"
            aria-label={t("budget")}
            className="rounded border border-hairline bg-canvas/70 px-3 py-1.5 font-medium"
            onClick={() => setIsBudgetModalOpen(true)}
          >
            {t("budget")}
          </button>
        </div>
        {isBudgetModalOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-3xl rounded-lg border border-hairline bg-canvas p-3 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">{t("estimationBudget")}</div>
                <button
                  type="button"
                  aria-label={t("closeBudget")}
                  className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                  onClick={() => setIsBudgetModalOpen(false)}
                >
                  {t("close")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-0.5 block">{t("budgetAmount")}</span>
                  <input
                    aria-label={t("budgetAmount")}
                    type="number"
                    className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                    value={state.projectBudget.amount}
                    onChange={(event) => {
                      const nextAmount = Number(event.target.value);

                      if (!Number.isNaN(nextAmount)) {
                        state.updateProjectBudget({ amount: nextAmount });
                      }
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-0.5 block">{t("currency")}</span>
                  <input
                    aria-label={t("currency")}
                    className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                    value={state.projectBudget.currency}
                    onChange={(event) =>
                      state.updateProjectBudget({
                        currency: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
              </div>
              <div className="mt-2 rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px]">
                <div>
                  {t("currentEstimation")}: {" "}
                  {formatCurrency(
                    estimateSummary.totalCost,
                    state.projectBudget.currency,
                  )}
                </div>
                <div>
                  {t("budgetLabel")}: {" "}
                  {formatCurrency(
                    state.projectBudget.amount,
                    state.projectBudget.currency,
                  )}
                </div>
                <div
                  className={overBudget ? "text-red-600" : "text-emerald-700"}
                >
                  {overBudget ? t("overBudget") : t("withinBudget")}
                </div>
              </div>
              <div className="mt-3 rounded border border-hairline bg-canvas/70 p-2 text-[11px]">
                <div className="mb-2 font-medium text-body">
                  {t("estimationDetails")}
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="px-1 py-1 font-medium">{t("tableItem")}</th>
                        <th className="px-1 py-1 font-medium">{t("tableMaterial")}</th>
                        <th className="px-1 py-1 font-medium">{t("tablePrice")}</th>
                        <th className="px-1 py-1 font-medium">{t("tableQuality")}</th>
                        <th className="px-1 py-1 font-medium">{t("tableTotal")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.items.length === 0 ? (
                        <tr>
                          <td
                            className="px-1 py-2 text-ink-muted-48"
                            colSpan={5}
                          >
                            -
                          </td>
                        </tr>
                      ) : (
                        state.items
                          .filter((item) => normalizeItemPricingRule(item.pricing).mode !== "none")
                          .map((item) => {
                          const itemPricing = normalizeItemPricingRule(
                            item.pricing,
                          );
                          const itemEstimate = estimateByItemId.get(item.id);

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-hairline/60"
                            >
                              <td className="px-1 py-1">
                                {item.name ?? item.id}
                              </td>
                              <td className="px-1 py-1">
                                {itemPricing.materialName || "-"}
                              </td>
                              <td className="px-1 py-1">
                                {formatPlainPrice(itemPricing.unitPrice)}
                              </td>
                              <td className="px-1 py-1">
                                {formatEstimateQuality(
                                  itemPricing.mode,
                                  itemEstimate?.quantity ?? 0,
                                )}
                              </td>
                              <td className="px-1 py-1">
                                {formatPlainTotal(itemEstimate?.cost ?? 0)}
                              </td>
                            </tr>
                          );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {isImportPolygonsModalOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-3xl rounded-lg border border-hairline bg-canvas p-3 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">{t("importPolygonsDialogTitle")}</div>
                <button
                  type="button"
                  aria-label={t("close")}
                  className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                  onClick={() => setIsImportPolygonsModalOpen(false)}
                >
                  {t("close")}
                </button>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px]">
                    {t("importPolygonsPromptLabel")}
                  </span>
                  <textarea
                    aria-label={t("importPolygonsPromptLabel")}
                    className="h-24 w-full rounded border border-hairline bg-canvas/70 px-2 py-1 text-xs"
                    value={IMPORT_POLYGON_PROMPT_TEMPLATE}
                    readOnly
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-hairline bg-canvas/70 px-2 py-1 text-xs"
                  aria-label={t("importPolygonsCopyPrompt")}
                  onClick={async () => {
                    try {
                      await window.navigator.clipboard.writeText(
                        IMPORT_POLYGON_PROMPT_TEMPLATE,
                      );
                    } catch {
                      window.alert(t("importPolygonsCopyFailed"));
                    }
                  }}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  {t("importPolygonsCopyPrompt")}
                </button>
                <label className="block">
                  <span className="mb-1 block text-[11px]">
                    {t("importPolygonsInput")}
                  </span>
                  <textarea
                    aria-label={t("importPolygonsInput")}
                    className="h-56 w-full rounded border border-hairline bg-canvas/70 px-2 py-1 text-xs"
                    placeholder='{"房间A": [[0, 0], [1000, 0], [1000, 800], [0, 800]]}'
                    value={importPolygonJsonDraft}
                    onChange={(event) =>
                      setImportPolygonJsonDraft(event.target.value)
                    }
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border border-hairline bg-canvas/70 px-3 py-1"
                    onClick={() => setIsImportPolygonsModalOpen(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-hairline bg-canvas/70 px-3 py-1 font-medium"
                    onClick={() => {
                      try {
                        const polygons = parseImportedPolygonJson(
                          importPolygonJsonDraft,
                        );
                        state.addPolygons(polygons);
                        setIsImportPolygonsModalOpen(false);
                        setImportPolygonJsonDraft("");
                      } catch {
                        window.alert(t("importPolygonsInvalid"));
                      }
                    }}
                  >
                    {t("importPolygonsAction")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {isAssetLibraryModalOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-hairline bg-canvas p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">{t("assetLibraryDialogTitle")}</div>
                <button
                  type="button"
                  aria-label={t("close")}
                  className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                  onClick={() => setIsAssetLibraryModalOpen(false)}
                >
                  {t("close")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableTemplates.map((template) => (
                  <div
                    key={`${template.name}-${template.kind}-${template.points.length}`}
                    className="flex min-h-20 flex-col justify-between rounded border border-hairline bg-canvas/70 px-3 py-2"
                  >
                    <span className="text-xs font-medium">{template.name}</span>
                    <button
                      type="button"
                      className="mt-2 rounded border border-hairline bg-canvas px-2 py-1 text-xs"
                      aria-label={template.name}
                      onClick={() => {
                        state.addPrimitiveFromTemplate(template, viewportCenter);
                        setIsAssetLibraryModalOpen(false);
                      }}
                    >
                      {t("insertAsset")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {isTileModalOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-hairline bg-canvas p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">{t("tileDialogTitle")}</div>
                <button
                  type="button"
                  aria-label={t("close")}
                  className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                  onClick={() => setIsTileModalOpen(false)}
                >
                  {t("close")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="rounded border border-hairline bg-canvas/60 p-3">
                  <span className="mb-0.5 block text-xs">{t("tileX")}</span>
                  <input
                    aria-label={t("tileX")}
                    type="number"
                    min={1}
                    className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                    value={tileXDraft}
                    onChange={(event) => setTileXDraft(event.target.value)}
                  />
                </label>
                <label className="rounded border border-hairline bg-canvas/60 p-3">
                  <span className="mb-0.5 block text-xs">{t("tileY")}</span>
                  <input
                    aria-label={t("tileY")}
                    type="number"
                    min={1}
                    className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                    value={tileYDraft}
                    onChange={(event) => setTileYDraft(event.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="rounded border border-hairline bg-canvas/70 px-3 py-1"
                  onClick={() => {
                    const x = Number(tileXDraft);
                    const y = Number(tileYDraft);

                    if (!Number.isNaN(x) && !Number.isNaN(y)) {
                      state.tileSelectedItem(x, y);
                    }

                    setIsTileModalOpen(false);
                  }}
                >
                  {t("applyTile")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <CanvasEditor
          items={state.items}
          layers={state.layers}
          zoom={zoomLevel}
          onZoomChange={setZoomLevel}
          selectedItemIds={state.selectedItemIds}
          onSelectItem={(itemId) => state.selectSingleItem(itemId)}
          onSelectItems={(itemIds) => state.selectItems(itemIds)}
          onClearSelection={() => state.selectItems([])}
          onMoveSelectedBy={(delta) => {
            const selected = state.items.find((item) => item.id === state.selectedItemIds[0]);
            const selectedLayer = selected
              ? state.layers.find((layer) => layer.id === selected.layerId)
              : null;

            if (selectedLayer?.locked) {
              return;
            }

            state.moveSelectedItemBy(delta);
          }}
          onRotateSelectedBy={(deltaDeg) =>
            state.rotateSelectedPrimitiveBy(deltaDeg)
          }
          onMoveVertex={(vertex, point) => {
            const selected = state.items.find(
              (item) => item.id === vertex.itemId,
            );
            const selectedLayer = selected
              ? state.layers.find((layer) => layer.id === selected.layerId)
              : null;

            if (!selected || selectedLayer?.locked) {
              return;
            }

            state.selectSingleItem(vertex.itemId);
            state.updateSelectedPrimitivePoint(vertex.pointIndex, point);
          }}
          onMoveSelectedEdgeBy={(edgeHit, delta) => {
            const selected = state.items.find((item) => item.id === edgeHit.itemId);
            const selectedLayer = selected
              ? state.layers.find((layer) => layer.id === selected.layerId)
              : null;

            if (!selected || selectedLayer?.locked) {
              return;
            }

            state.selectSingleItem(edgeHit.itemId);
            state.moveSelectedPrimitiveEdgeBy(
              {
                startPointIndex: edgeHit.startPointIndex,
                endPointIndex: edgeHit.endPointIndex,
              },
              delta,
            );
          }}
          onViewportCenterChange={setViewportCenter}
        />
      </div>
    </section>
  );
}
