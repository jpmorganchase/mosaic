import React from 'react'
import PropTypes from 'prop-types'
import { MDXProvider } from "@mdx-js/react"

const components = { Accordion: props => <div {...props}/>
, Callout: props => <div {...props}/>
, TileLink: props => <div {...props}/>
, Tiles: props => <div {...props}/>
, Hero: props => <div {...props}/>
, Link: props => <div {...props}/>
, PageFilterView: props => <div {...props}/> };

const Layout = ({ children }) => (
  <MDXProvider components={components}>
    {children}
  </MDXProvider>
)

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
