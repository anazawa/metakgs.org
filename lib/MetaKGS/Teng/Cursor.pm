package MetaKGS::Teng::Cursor;
use strict;
use warnings;

sub new {
    my $class = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;
    my $self = bless {}, $class;

    for my $key (qw/teng query/) {
        $self->{$key} = $args{$key} if exists $args{$key};
    }

    $self->init( \%args );

    $self;
}

sub init {
    my ( $self, $args ) = @_;

    $self->set_inflators( $args->{inflators} ) if exists $args->{inflators};

    return;
}

sub teng {
    $_[0]->{teng};
}

sub query {
    $_[0]->{query};
}

sub sth {
    my $self = shift;

    if ( @_ ) {
        $self->{sth} = shift;
    }
    elsif ( !exists $self->{sth} ) {
        $self->{sth} = $self->teng->execute( @{$self->query} );
    }

    $self->{sth};
}

sub _inflators {
    my $self = shift;
    $self->{_inflators} = shift if @_;
    $self->{_inflators} ||= {};
}

sub set_inflators {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;

    my %inflators;
    while ( my ($key, $val) = each %args ) {
        $inflators{$key} = [ ref $val eq 'ARRAY' ? @$val : $val ];
    }

    $self->_inflators( \%inflators );

    return;
}

sub run_inflators {
    my $self = shift;
    my %row = @_ == 1 ? %{$_[0]} : @_;
    my $inflators = $self->_inflators;

    for my $key ( keys %$inflators ) {
        next unless exists $row{$key};
        for my $inflator ( @{$inflators->{$key}} ) {
            $row{$key} = $inflator->( $row{$key} );
        }
    }

    \%row;
}

sub next {
    my $self = shift;
    my $sth = $self->sth;
    my $row = $sth && $sth->fetchrow_hashref;

    if ( $sth and !$row ) {
        $self->sth( undef );
        $sth->finish;
    }

    return if !$sth or !$row;

    $self->run_inflators( $row );
}

sub all {
    my $self = shift;
    my $sth = $self->sth;
    my $rows = $sth ? $sth->fetchall_arrayref({}) : [];

    if ( $sth ) {
        $self->sth( undef );
        $sth->finish;
    }

    [ map { $self->run_inflators($_) } @$rows ];
}

1;
