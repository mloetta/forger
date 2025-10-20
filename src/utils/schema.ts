export enum SchemaType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Object = 'object',
}

export namespace Schema {
  export interface ISchema {
    string: {
      type: SchemaType.String;
      default?: string;

      min?: number;
      max?: number;
      values?: string[];
    };

    number: {
      type: SchemaType.Number;
      default?: number;

      min?: number;
      max?: number;

      int?: boolean;

      values?: number[];
    };

    boolean: {
      type: SchemaType.Boolean;
      default?: boolean;
    };

    array: {
      type: SchemaType.Array;
      default?: Array<any>;
      fields?: Array<ISchema[keyof ISchema]>;
    };

    object: {
      type: SchemaType.Object;
      default?: Record<string, any>;
      fields?: Record<string, ISchema[keyof ISchema]>;
    };
  }

  export function string(metadata?: Omit<ISchema[SchemaType.String], 'type'>) {
    metadata = metadata ?? {};

    return {
      type: SchemaType.String,
      max: metadata.max ?? -1,
      min: metadata.min ?? -1,
      value: metadata.default ?? '',
      values: metadata.values || [],

      validate() {
        if (typeof this.value !== 'string') {
          throw new Error(`Current value is not a string`);
        }

        if (this.values.length && this.values.indexOf(this.value) == -1) {
          throw new Error(`String value is not in expected values`);
        }

        if ((this.max != -1 && this.value.length > this.max) || (this.min != -1 && this.value.length < this.min)) {
          throw new Error(`String length is not in range`);
        }
      },
    };
  }

  export function number(metadata?: Omit<ISchema[SchemaType.Number], 'type'>) {
    metadata = metadata ?? {};

    return {
      type: SchemaType.Number,
      int: !!metadata.int,
      max: metadata.max ?? -1,
      min: metadata.min ?? -1,
      value: metadata.default ?? 0,
      values: metadata.values || [],

      validate() {
        if (typeof this.value !== 'number') {
          throw new Error(`Current value is not a number`);
        }

        if (this.values.length && this.values.indexOf(this.value) == -1) {
          throw new Error(`Number value is not in expected values`);
        }

        if (this.int && !Number.isInteger(this.value)) {
          throw new Error(`Current value is not a int`);
        }

        if ((this.max != -1 && this.value > this.max) || (this.min != -1 && this.value < this.min)) {
          throw new Error(`Number value is not in range`);
        }
      },
    };
  }

  export function boolean(metadata?: Omit<ISchema[SchemaType.Boolean], 'type'>) {
    metadata = metadata ?? {};

    return {
      type: SchemaType.Boolean,
      value: metadata.default ?? false,

      validate() {
        if (typeof this.value !== 'boolean') {
          throw new Error(`Current value is not a boolean`);
        }
      },
    };
  }

  export function array<T extends Array<ISchema[keyof ISchema]>>(fields?: T) {
    return {
      type: SchemaType.Array,
      value: [] as any as T,
      fields: fields || [],

      validate() {
        if (!Array.isArray(this.value)) {
          throw new Error(`Current value is not an array`);
        }
      },
    };
  }

  export function object<T extends Record<string, ISchema[keyof ISchema]>>(fields?: T) {
    fields = fields ?? ({} as T);

    return {
      type: SchemaType.Object,
      value: {} as T,
      fields: fields || {},

      json() {
        this.validate();

        return this.value;
      },

      validate() {
        if (typeof this.value !== 'object' || Array.isArray(this.value) || this.value === null) {
          throw new Error(`Current value is not an object`);
        }
      },
    };
  }
}
