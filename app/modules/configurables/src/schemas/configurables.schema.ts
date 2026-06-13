/* START: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */
export interface FieldSchemaType {
  fieldName?: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "color"
    | "url"
    | "enum"
    | "datetime"
    | "file"
    | "files";
  required?: boolean;
  label?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  fields?: FieldSchemaType[];
  item?: FieldSchemaType;
}
/* END: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */

export type ConfigurableSchemas = {
  formSchema: FieldSchemaType[];
};



export const configurableSchemas: ConfigurableSchemas = {
  formSchema: [
    {
      fieldName: "appName",
      type: "string",
      required: true,
      label: "App Name",
    },
    {
      fieldName: "logoUrl",
      type: "url",
      required: true,
      label: "Logo URL",
    },
    {
      fieldName: "brandColor",
      type: "object",
      required: true,
      label: "Brand Color",
      fields: [
        {
          fieldName: "primary",
          type: "color",
          required: true,
          label: "Primary",
        },
        {
          fieldName: "secondary",
          type: "color",
          required: true,
          label: "Secondary",
        },
        {
          fieldName: "accent",
          type: "color",
          required: true,
          label: "Accent",
        },
      ],
    },
    {
      fieldName: "tagline",
      type: "string",
      required: false,
      label: "Tagline / Subtitle",
      maxLength: 120,
    },
    {
      fieldName: "teamName",
      type: "string",
      required: false,
      label: "Team Name",
      maxLength: 60,
    },
    {
      fieldName: "signalRefreshIntervalSeconds",
      type: "number",
      required: false,
      label: "Signal Refresh Interval (seconds)",
      min: 5,
      max: 120,
    },
    {
      fieldName: "minimumConfidenceThreshold",
      type: "number",
      required: false,
      label: "Minimum Confidence Threshold (%)",
      min: 0,
      max: 100,
    },
    {
      fieldName: "showTeamStats",
      type: "boolean",
      required: false,
      label: "Show Team Stats Bar",
    },
    {
      fieldName: "showTrendChart",
      type: "boolean",
      required: false,
      label: "Show Trend Chart",
    },
    {
      fieldName: "showSignalHistory",
      type: "boolean",
      required: false,
      label: "Show Signal History Feed",
    },
    {
      fieldName: "signalHistoryLimit",
      type: "number",
      required: false,
      label: "Signal History Entries to Show",
      min: 5,
      max: 100,
    },
    {
      fieldName: "uiColors",
      type: "object",
      required: false,
      label: "UI Colors",
      fields: [
        { fieldName: "background", type: "color", required: false, label: "Background" },
        { fieldName: "surface", type: "color", required: false, label: "Surface / Cards" },
        { fieldName: "success", type: "color", required: false, label: "Success / High Signal" },
        { fieldName: "danger", type: "color", required: false, label: "Danger / Low Signal" },
        { fieldName: "warning", type: "color", required: false, label: "Warning / Medium Signal" },
        { fieldName: "textPrimary", type: "color", required: false, label: "Text Primary" },
        { fieldName: "textSecondary", type: "color", required: false, label: "Text Secondary" },
      ],
    },
    {
      fieldName: "heroCta",
      type: "string",
      required: false,
      label: "Hero CTA Label",
      maxLength: 40,
    },
    {
      fieldName: "footerText",
      type: "string",
      required: false,
      label: "Footer Text",
      maxLength: 200,
    },
  ],
};
