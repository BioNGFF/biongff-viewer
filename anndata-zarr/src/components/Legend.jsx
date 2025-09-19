import React, { useMemo } from 'react';

import _ from 'lodash';

import { getColor } from '../utils';
import '../index.css';

export const Legend = ({ min, max, colorscale }) => {
  const spanList = useMemo(() => {
    return _.range(100).map((i) => {
      const color = getColor({ value: i / 100, colorscale });
      return (
        <span
          key={i}
          className="grad-step"
          style={{ backgroundColor: `rgba(${color})` }}
        ></span>
      );
    });
  }, [colorscale]);

  return (
    <div className="legend">
      <div className="gradient">
        {spanList}
        <span className="domain-min">{min.toFixed(2)}</span>
        <span className="domain-mid">{((min + max) / 2).toFixed(2)}</span>
        <span className="domain-max">{max.toFixed(2)}</span>
      </div>
    </div>
  );
};
