console.log( 'test' );

var margin = { top: 100, right: 100, bottom: 100, left: 100 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


function getDimensions( data ) {
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

function initializePlot( dimensions ) {

    const xLabel = 'Party Type';
    const yLabel = 'Cause of Action';
    const margin = { left: 10, right: 10, top: 10, bottom: 10 };

    const svg = d3.select( 'svg' );
    const width = svg.attr( 'width' );
    const height = svg.attr( 'height' );
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const plotGroup = svg.append( 'g' )
        .attr( 'transform', `translate(${margin.left},${margin.top})` );
    const xAxisG = plotGroup.append( 'g' )
        .attr( 'transform', `translate(0, ${innerHeight})` )
        .attr( 'opacity', 0.2 );
    const yAxisG = plotGroup.append( 'g' )
        .attr( 'opacity', 0.2 );


    xAxisG.append( 'text' )
        .attr( 'class', 'axis-label' )
        .attr( 'x', innerWidth / 2 )
        .attr( 'y', 90 )
        .text( xLabel );

    yAxisG.append( 'text' )
        .attr( 'class', 'axis-label' )
        .attr( 'x', -innerHeight / 2 )
        .attr( 'y', -100 )
        .attr( 'transform', `rotate(-90)` )
        .style( 'text-anchor', 'middle' )
        .text( yLabel );

    const xScale = d3.scalePoint();
    const yScale = d3.scalePoint();

    const xAxis = d3.axisBottom()
        .scale( xScale )
        .tickPadding( 15 )
        .tickSize( -innerHeight );

    const yAxis = d3.axisLeft()
        .scale( yScale )
        .tickPadding( 15 )
        .tickSize( -innerWidth );

    xScale
        .domain( dimensions.partyTypes )
        .range( [ 0, innerWidth ] );

    yScale
        .domain( dimensions.coas )
        .range( [ innerHeight, 0 ] );

    xAxisG.call( xAxis );
    yAxisG.call( yAxis );

    return { plotGroup, xScale, yScale };
}

function drawData( data, { plotGroup, xScale, yScale } ) {
    const xValue = d => d.partyType;
    const yValue = d => d.coa;
    const maxCoaCount = Math.max( ...data.map( d => d.count ) );
    plotGroup.selectAll( 'circle' ).data( data )
        .enter().append( 'circle' )
        .attr( 'cx', d => xScale( xValue( d ) ) )
        .attr( 'cy', d => yScale( yValue( d ) ) )
        .attr( 'fill', 'black' )
        .attr( 'fill-opacity', 0.5 )
        .attr( 'r', d => 100 * Math.sqrt((d.count / maxCoaCount)/Math.PI) );
}

function plot( rawData ) {
    const dimensions = getDimensions( rawData );
    const plotComponents = initializePlot( dimensions );
    const plotData = dimensions.partyTypes.reduce( ( results, partyType ) => {
        const coaCounts = rawData[ partyType ];
        const coas = Object.keys( coaCounts );
        coas.forEach( coa => results.push( { coa, partyType, count: coaCounts[ coa ] } ) );
        return results;
    }, [] );
    console.log( plotData );
    drawData( plotData, plotComponents );
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