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

    const svg = d3.select( 'svg' );
    const plotGroup = svg.append( 'g' )
        .attr( 'transform', `translate(${config.margin.left},${config.margin.top})` );

    const drawGroup = plotGroup.append( 'g' )
        .attr( 'class', 'draw' );

    const xAxisGroup = plotGroup.append( 'g' )
        .attr( 'class', 'x-axis' );

    const yAxisGroup = plotGroup.append( 'g' )
        .attr( 'class', 'y-axis' );

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

function getSvgDims() {
    const svg = d3.select( 'svg' );
    const width = svg.attr( 'width' );
    const height = svg.attr( 'height' );
    return { width, height };
}

function setSvgDims( { width, height } ) {
    const svg = d3.select( 'svg' );
    svg.attr( 'width', width );
    svg.attr( 'height', height );
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
        .attr( 'transform', `translate(0, ${innerHeight})` )
        .style( 'text-anchor', 'end' )
        .text( xLabel );

    plotComponents.yAxisGroup.append( 'text' )
        .attr( 'class', 'axis-label' )
        .attr( 'x', 0 )
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
        .append( ( text, index, nodeList ) => {
            const textNodeBox = nodeList[ index ].querySelector( 'text' ).getBoundingClientRect();
            const rect = document.createElement( 'rect' );
            d3.select( rect )
                .attr( 'x', 0 )
                .attr( 'y', 0 )
                .attr( 'fill', '#fff' )
                .attr( 'width', textNodeBox.width )
                .attr( 'height', textNodeBox.height );
            return rect;
        } );

    // add mouse handlers
    const plotSvg = getPlotSvg();
    const ticksByText = {};
    d3.selectAll( ".tick>text" )
        .nodes()
        .forEach( function ( n ) {
            ticksByText[ n.innerHTML ] = n.parentElement;
        } );
    let activeTickElement = null;
    plotSvg
        .addEventListener( 'mousemove', function ( e ) {
            var x = e.pageX - plotSvg.getBoundingClientRect().x - config.margin.left;
            const nearestLabel = xTickPositions.reduce( ( result, pos, index ) => {
                const distance = Math.abs( x - pos );
                if ( result.distance > distance ) {
                    return { distance, text: dimensionLabels.partyTypes[ index ] };
                }
                return result;
            }, { distance: Infinity, label: null } );
            const tickElement = ticksByText[ nearestLabel.text ];
            if ( tickElement ) {
                tickElement.classList.add( 'active' );
                if ( activeTickElement && (tickElement !== activeTickElement) ) {
                    activeTickElement.classList.remove( 'active' );
                }
                activeTickElement = tickElement;
            }
        } );

    return { xScale, yScale };
}

function plot( rawData ) {
    const dimensionLabels = getDimensionLabels( rawData );
    const plotData = dimensionLabels.partyTypes.reduce( ( results, partyType ) => {
        const coaCounts = rawData[ partyType ];
        const coas = Object.keys( coaCounts );
        coas.forEach( coa => results.push( { coa, partyType, count: coaCounts[ coa ] } ) );
        return results;
    }, [] );

    const config = { margin: { left: 200, right: 10, top: 30, bottom: 200 } };

    const plotComponents = initializePlot( dimensionLabels, config );

    const scales = initializeAxes( rawData, plotData, dimensionLabels, plotComponents, config );
    drawData( plotData, plotComponents, scales );
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