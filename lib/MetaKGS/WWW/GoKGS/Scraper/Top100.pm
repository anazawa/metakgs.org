package MetaKGS::WWW::GoKGS::Scraper::Top100;
use strict;
use warnings;
use parent qw/WWW::GoKGS::Scraper::Top100/;
use HTML::TreeBuilder::LibXML;

sub init {
    my ( $self, $args ) = @_;

    $self->SUPER::init( $args );

    $self->_tree_builder_class( 'HTML::TreeBuilder::LibXML' );

    return;
}

sub scrape {
    my ( $self, @args ) = @_;
    my $result = $self->SUPER::scrape( @args );

    for my $player ( @{ $result->{players} || [] } ) {
        $player->{position} += 0;
        $player->{uri}      .= q{};
    }

    $result;
}

1;
