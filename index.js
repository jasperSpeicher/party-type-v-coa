function getDimensionLabels( data ) {
    const partyTypes = Object.keys( data );
    const coas = Array.from(
        partyTypes
            .map( partyType => data[ partyType ] )
            .reduce( ( set, subset ) => {
                Object.keys( subset ).forEach( ( sub ) => set.add( sub ) );
                return set;
            }, new Set() )
    ).sort();
    return { partyTypes, coas };
}

function initializePlot( dimensionLabels, config ) {

    const plotSvg = d3.select( getPlotSvg() );
    const xAxisSvg = d3.select( getXAxisSvg() );
    const yAxisSvg = d3.select( getYAxisSvg() );

    const plotGroup = plotSvg.append( 'g' )
        .attr( 'transform', `translate(${config.margin.left},${config.margin.top})` );

    const drawGroup = plotGroup.append( 'g' )
        .attr( 'class', 'draw' );

    const yAxisGroup = yAxisSvg.append( 'g' )
        .attr( 'transform', `translate(${config.margin.left},${config.margin.top})` )
        .append( 'g' )
        .attr( 'class', 'y-axis' );

    const xAxisGroup = xAxisSvg.append( 'g' )
        .attr( 'transform', `translate(${config.margin.left},${config.margin.top})` )
        .append( 'g' )
        .attr( 'class', 'x-axis' );

    return { plotGroup, drawGroup, xAxisGroup, yAxisGroup };
}

function datumSize( maxCoaCount ) {
    return d => 100 * Math.sqrt( (d.count / maxCoaCount) / Math.PI );
}

function drawData( data, { plotGroup, drawGroup }, scales ) {
    const maxCoaCount = Math.max( ...data.map( d => d.count ) );
    const xValue = d => d.partyType;
    const yValue = d => d.coa;
    drawGroup.selectAll( 'circle' ).data( data )
        .enter().append( 'circle' )
        .attr( 'cx', d => scales.xScale( xValue( d ) ) )
        .attr( 'cy', d => scales.yScale( yValue( d ) ) )
        .attr( 'fill', 'black' )
        .attr( 'fill-opacity', 0.5 )
        .attr( 'r', datumSize( maxCoaCount ) );
}

function getPlotSvg() {
    return document.querySelector( '.plot-container svg' );
}

function getXAxisSvg() {
    return document.querySelector( '.x-axis-container svg' );
}

function getYAxisSvg() {
    return document.querySelector( '.y-axis-container svg' );
}

function getSvgDims() {
    const svg = d3.select( 'svg' );
    const width = svg.attr( 'width' );
    const height = svg.attr( 'height' );
    return { width, height };
}

function setSvgDims( { width, height } ) {
    const plotSvg = d3.select( '.plot-container svg' );
    const xAxisSvg = d3.select( '.x-axis-container svg' );
    const yAxisSvg = d3.select( '.y-axis-container svg' );
    plotSvg.attr( 'width', width );
    plotSvg.attr( 'height', height );
    xAxisSvg.attr( 'width', width );
    xAxisSvg.attr( 'height', height );
    yAxisSvg.attr( 'width', width );
    yAxisSvg.attr( 'height', height );
}

function sum( array ) {
    return array.reduce( ( sum, v ) => { // get sum
        return sum + v;
    }, 0 );
}

function initializeAxes( rawData, plotData, dimensionLabels, plotComponents, config ) {

    // compute the widths of the ticks and the plot based on the data
    const maxCoaCountByPartyType = dimensionLabels.partyTypes.map( ( partyType ) => {
        return Math.max( ...(Object.keys( rawData[ partyType ] ).map( coa => rawData[ partyType ][ coa ] )) );
    } );
    const maxCoaCountByCoa = dimensionLabels.coas.map( ( coa ) => {
        return Math.max( ...(plotData.filter( d => d.coa === coa ).map( d => d.count )) );
    } );
    const maxCoaCount = Math.max( ...maxCoaCountByPartyType );
    const countToWidth = count => datumSize( maxCoaCount )( { count } ) * 2;
    const widthsByPartyType = maxCoaCountByPartyType.map( countToWidth );
    const widthsByCoa = maxCoaCountByCoa.map( countToWidth );

    const positionsFromWidths = ( width, index, array ) => {
        // take all up to this index
        return sum( array.slice( 0, index ) ) + array[ index ] / 2; // add half of current width
    };

    const xTickPositions = widthsByPartyType.map( positionsFromWidths );
    const yTickPositions = widthsByCoa.map( positionsFromWidths );

    const innerWidth = Math.round( sum( widthsByPartyType ) );
    const innerHeight = Math.round( sum( widthsByCoa ) );
    const svgDims = {
        width: innerWidth + config.margin.left + config.margin.right,
        height: innerHeight + config.margin.top + config.margin.bottom
    };

    // create the scales
    const xScale = d3.scaleOrdinal();
    const yScale = d3.scaleOrdinal();
    xScale
        .domain( dimensionLabels.partyTypes )
        .range( xTickPositions );

    yScale
        .domain( dimensionLabels.coas )
        .range( yTickPositions );


    // label and position the axes
    const xLabel = 'Party Type';
    const yLabel = 'Cause of Action';

    plotComponents.xAxisGroup.attr( 'transform', `translate(0, ${innerHeight})` );

    plotComponents.xAxisGroup.append( 'text' )
        .attr( 'class', 'axis-label' )
        .attr( 'x', 0 )
        .attr( 'y', -10 )
        .style( 'text-anchor', 'end' )
        .text( xLabel );

    plotComponents.yAxisGroup.append( 'text' )
        .attr( 'class', 'axis-label' )
        .attr( 'x', -5 )
        .attr( 'y', -10 )
        .style( 'text-anchor', 'end' )
        .text( yLabel );

    const xAxis = d3.axisBottom()
        .scale( xScale )
        .tickPadding( 0 )
        .tickSize( -innerHeight );

    const yAxis = d3.axisLeft()
        .scale( yScale )
        .tickPadding( 0 )
        .tickSize( -innerWidth );

    plotComponents.xAxisGroup.call( xAxis );
    plotComponents.yAxisGroup.call( yAxis );

    setSvgDims( svgDims );

    // style the tick labels
    d3.selectAll( '.tick' )
        .insert( ( text, index, nodeList ) => {
            const rect = document.createElementNS( 'http://www.w3.org/2000/svg', 'rect' );
            d3.select( rect )
                .attr( 'x', 0 )
                .attr( 'y', 0 )
                .attr( 'fill', '#fff' );
            return rect;
        }, ':first-child' );
    d3.selectAll( '.x-axis .tick rect' )
        .attr( 'width', ( text, index, nodeList ) => nodeList[ index ].parentNode.querySelector( 'text' ).getBoundingClientRect().height )
        .attr( 'height', ( text, index, nodeList ) => nodeList[ index ].parentNode.querySelector( 'text' ).getBoundingClientRect().width );
    d3.selectAll( '.y-axis .tick rect' )
        .attr( 'width', ( text, index, nodeList ) => nodeList[ index ].parentNode.querySelector( 'text' ).getBoundingClientRect().width )
        .attr( 'height', ( text, index, nodeList ) => nodeList[ index ].parentNode.querySelector( 'text' ).getBoundingClientRect().height );


    return { xScale, yScale, tickPositions: { x: xTickPositions, y: yTickPositions } };
}

function initializeMouseHandlers( dimensionLabels, plotData, config, tickPositions ) {
    const plotSvg = getPlotSvg();
    const percentileElement = document.querySelector( '.info-box' );
    const selectionsByDimensionLabel = { coa: {}, partyType: {} };
    dimensionLabels.coas.reduce( ( map, coa ) => {
        map.coa[ coa ] = d3.select( plotSvg )
            .selectAll( 'circle' )
            .data( plotData )
            .filter( d => d.coa === coa );
        return map;
    }, selectionsByDimensionLabel );
    dimensionLabels.partyTypes.reduce( ( map, partyType ) => {
        map.partyType[ partyType ] = d3.select( plotSvg )
            .selectAll( 'circle' )
            .data( plotData )
            .filter( d => d.partyType === partyType );
        return map;
    }, selectionsByDimensionLabel );
    const ticksByText = {};
    d3.selectAll( ".tick>text" )
        .nodes()
        .forEach( function ( n ) {
            ticksByText[ n.innerHTML ] = n.parentElement;
        } );
    let activeTickElements = [ null, null ];
    let activeSelections = null;
    const html = document.querySelector( 'html' );
    const xAxisElement = document.querySelector( '.x-axis-container' );
    const plotElement = document.querySelector( '.plot-container' );
    let lastMouseEvent = null;
    const mouseMove = function ( e ) {
        const x = e.clientX - plotSvg.getBoundingClientRect().x - config.margin.left;
        const y = e.clientY - plotSvg.getBoundingClientRect().y - config.margin.top;
        if ( !e.fake ) {
            lastMouseEvent = e;
        }

        const getNearestLabel = ( positions, mouseCoordinate, labels ) => {
            return positions
                .reduce( ( result, pos, index ) => {
                    const distance = Math.abs( mouseCoordinate - pos );
                    if ( result.distance > distance ) {
                        return { distance, text: labels[ index ] };
                    }
                    return result;
                }, { distance: Infinity, label: null } )
        };

        // hover the axes
        const nearestLabels = {
            partyType: getNearestLabel( tickPositions.x, x, dimensionLabels.partyTypes ),
            coa: getNearestLabel( tickPositions.y, y, dimensionLabels.coas )
        };
        const tickElements = [
            ticksByText[ nearestLabels.partyType.text ],
            ticksByText[ nearestLabels.coa.text ]
        ];

        tickElements.forEach( ( tickElement, index ) => {
            if ( tickElement ) {
                tickElement.classList.add( 'active' );
                tickElement.parentNode.append( tickElement );
                if ( activeTickElements[ index ] && (tickElement !== activeTickElements[ index ]) ) {
                    activeTickElements[ index ].classList.remove( 'active' );
                }
                activeTickElements[ index ] = tickElement;
            }
        } );

        // hover the data
        if ( activeSelections ) {
            activeSelections.coa
                .attr( 'fill', 'black' );
            activeSelections.partyType
                .attr( 'fill', 'black' );
        }

        const highlightColor = '#000dba';
        const selections = {
            coa: selectionsByDimensionLabel.coa[ nearestLabels.coa.text ],
            partyType: selectionsByDimensionLabel.partyType[ nearestLabels.partyType.text ]
        };
        selections.coa
            .attr( 'fill', highlightColor );
        selections.partyType
            .attr( 'fill', highlightColor );

        const activeDatum = selections.coa
            .filter( d => d.partyType === nearestLabels.partyType.text );
        if ( activeDatum._groups[0].length > 0 ) {
            activeDatum.each(
                ( d, i, nodeList ) => {
                    const circleBox = nodeList[ i ].getBoundingClientRect();
                    percentileElement.style.display = 'block';
                    percentileElement.innerHTML = d.count;
                    percentileElement.style.top = circleBox.top + circleBox.height / 2 + 'px';
                    percentileElement.style.left = circleBox.left + circleBox.width / 2 + 'px';
                } );
        }else{
            percentileElement.style.display = 'none';
        }

        activeSelections = selections;

    };
    plotSvg
        .addEventListener( 'mousemove', mouseMove );

    const triggerMove = function () {
        if ( lastMouseEvent ) {
            mouseMove( {
                clientX: lastMouseEvent.clientX,
                clientY: lastMouseEvent.clientY,
                fake: true
            } );
        }
    }
    plotElement.addEventListener( 'scroll', triggerMove );
    document.addEventListener( 'scroll', triggerMove );

    // keep x scrolling with plot
    plotElement.addEventListener( 'scroll', ( e ) => {
        xAxisElement.scrollTo( plotElement.scrollLeft, 0 );
    } );
}

function percentRank( array, n ) {
    let L = 0;
    let S = 0;
    let N = array.length;

    for ( var i = 0; i < array.length; i++ ) {
        if ( array[ i ] < n ) {
            L += 1
        } else if ( array[ i ] === n ) {
            S += 1
        } else {

        }
    }

    return 100 * (L + (0.5 * S)) / N;
}


function populatePercentRanks( plotData ) {
    const counts = plotData.map( d => d.count ).filter( c => c );
    plotData.forEach( ( d ) => {
        d.percentRank = percentRank( counts, d.count );
    } );
    console.log( plotData );
}

function plot( rawData ) {
    const dimensionLabels = getDimensionLabels( rawData );
    const plotData = dimensionLabels.partyTypes.reduce( ( results, partyType ) => {
        const coaCounts = rawData[ partyType ];
        const coas = Object.keys( coaCounts );
        coas.forEach( coa => results.push( { coa, partyType, count: coaCounts[ coa ] } ) );
        return results;
    }, [] );
    populatePercentRanks( plotData );

    const config = { margin: { left: 300, right: 10, top: 30, bottom: 300 } };
    const plotComponents = initializePlot( dimensionLabels, config );
    const scales = initializeAxes( rawData, plotData, dimensionLabels, plotComponents, config );
    drawData( plotData, plotComponents, scales );
    initializeMouseHandlers( dimensionLabels, plotData, config, scales.tickPositions );
}


d3.json( "party_types_to_claims_dict.json" )
    .then( function ( data ) {
        console.log( 'data', data );
        /*
        Object.keys( data ).slice( 0, 10 ).reduce( ( result, key ) => {
            result[ key ] = data[ key ];
            return result;
        }, {} )
         */
        plot( data );
    } );