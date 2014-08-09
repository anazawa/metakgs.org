package MetaKGS::WWW::GoKGS::Scraper::TournList;
use strict;
use warnings;
use parent qw/WWW::GoKGS::Scraper::TournList/;
use HTML::TreeBuilder::LibXML;

sub init {
    my ( $self, $args ) = @_;

    $self->SUPER::init( $args );

    $self->_tree_builder_class( 'HTML::TreeBuilder::LibXML' );

    return;
}

sub do_scrape {
    my ( $self, @args ) = @_;
    $self->SUPER::scrape( @args );
}

sub scrape {
    my ( $self, @args ) = @_;
    my $result = $self->do_scrape( @args );

    for my $tournament ( @{ $result->{tournaments} || [] } ) {
        $tournament->{uri} .= q{};
    }

    for my $year ( @{ $result->{year_index} || [] } ) {
        $year->{year} += 0;
        $year->{uri}  .= q{} if exists $year->{uri};
    }

    $result;
}

1;
