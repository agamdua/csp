import { IncomingMessage, ServerResponse } from 'http';

import isFunction from './is-function';
import isString from './is-string';
import { ParsedDirectives, CamelCaseDirectives } from './types';

export = function parseDynamicDirectives (directives: CamelCaseDirectives, functionArgs: [IncomingMessage, ServerResponse]) {
  const result: ParsedDirectives = {};

  Object.keys(directives).forEach((key) => {
    const typedKey = key as keyof CamelCaseDirectives;
    const value = directives[typedKey];

    if (Array.isArray(value)) {
      result[typedKey] = value.map((element) => {
        if (isFunction(element)) {
          return element(...functionArgs);
        } else {
          return element;
        }
      });
    } else if (isFunction(value)) {
      result[typedKey] = value(...functionArgs);
    } else if (value === true || isString(value)) {
      result[typedKey] = value;
    }
  });

  return result;
}
