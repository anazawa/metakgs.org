package MetaKGS::WWW::GoKGS::Scraper::TournGames;
use strict;
use warnings;
use parent qw/WWW::GoKGS::Scraper::TournGames/;
use HTML::TreeBuilder::LibXML;

sub build_uri {
    my $class = shift;
    my %query = @_ == 1 ? %{$_[0]} : @_;

    my @q;
    for my $key (qw/id round/) {
        push @q, $key, $query{$key} if exists $query{$key};
    }

    $class->SUPER::build_uri( @q );
}

sub init {
    my ( $self, $args ) = @_;

    $self->SUPER::init( $args );

    $self->_tree_builder_class( 'HTML::TreeBuilder::LibXML' );

    return;
}

sub scrape {
    my ( $self, @args ) = @_;
    my $result = $self->SUPER::scrape( @args );

    $result->{round} += 0 if exists $result->{round};

    for my $game ( @{ $result->{games} || [] } ) {
        $game->{sgf_uri}    .= q{} if exists $game->{sgf_uri};
        $game->{board_size} += 0 if exists $game->{board_size};
        $game->{handicap}   += 0 if exists $game->{handicap};
    }

    $result->{next_round_uri} .= q{} if exists $result->{next_round_uri};
    $result->{previous_round_uri} .= q{} if exists $result->{previous_round_uri};

    for my $round ( @{ $result->{links}->{rounds} || [] } ) {
        $round->{round} += 0;
        $round->{uri}   .= q{} if exists $round->{uri};
    }

    for my $entrants ( @{ $result->{links}->{entrants} || [] } ) {
        $entrants->{uri} .= q{};
    }

    $result;
}

1;
