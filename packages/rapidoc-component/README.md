# Mosaic Rapidoc Component

`@jpmorganchase/mosaic-rapidoc-component` is a Rapidoc component for documenting Open APIs.

Refer to [Rapidoc](https://rapidocweb.com/)

## Installation

`yarn add @jpmorganchase/mosaic-rapidoc-component``

## Usage

To add to a Mosaic page

```
<Rapidoc spec-url="https://petstore.swagger.io/v2/swagger.json"/>
```

Pass additional props to `rapidoc`

```
<Rapidoc spec-url="https://petstore.swagger.io/v2/swagger.json" render-style="read"/>
```

Refer to the [Rapidoc API](https://rapidocweb.com/api.html#att) for supported props.
