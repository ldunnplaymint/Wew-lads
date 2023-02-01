/** @format */

import { css } from 'styled-components';
import { CornSeekerControlProps } from './index';

/**
 * Base styles for the corn seeker control component
 *
 * @param _ The corn seeker control properties object
 * @return Base styles for the corn seeker control component
 */
const baseStyles = (_: Partial<CornSeekerControlProps>) => css`
    color: white;
`;

/**
 * The corn seeker control component styles
 *
 * @param props The corn seeker control properties object
 * @return Styles for the corn seeker control component
 */
export const styles = (props: Partial<CornSeekerControlProps>) => css`
    ${baseStyles(props)}
`;
